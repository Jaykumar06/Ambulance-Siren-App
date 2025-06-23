// Global variables
let emergencyActive = false;
let sirenActive = false;
let alertsEnabled = false;
let currentMode = 'driver';
let sirenSound = null;
let userLocation = null;
let ambulanceLocations = [];
let proximityInterval = null;

// Simulated ambulance locations for demo
const demoAmbulances = [
    { lat: 28.4595, lng: 77.0266, id: 'amb1' },
    { lat: 28.4605, lng: 77.0276, id: 'amb2' }
];

/**
 * Switch between driver and local modes
 * @param {string} mode - 'driver' or 'local'
 */
function switchMode(mode) {
    currentMode = mode;
    
    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.mode-btn.${mode}`).classList.add('active');
    
    // Update sections
    document.querySelectorAll('.mode-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${mode}-mode`).classList.add('active');
    
    // Initialize mode-specific features
    if (mode === 'local') {
        startLocationTracking();
    }
}

/**
 * Toggle emergency mode for ambulance drivers
 */
function toggleEmergency() {
    emergencyActive = !emergencyActive;
    const btn = document.getElementById('emergency-text');
    const status = document.getElementById('emergency-status');
    const panel = document.getElementById('driver-status');
    
    if (emergencyActive) {
        btn.textContent = 'STOP EMERGENCY';
        status.textContent = 'ACTIVE';
        status.style.color = '#ff4757';
        panel.classList.add('emergency');
        
        // Auto-start siren when emergency is activated
        if (!sirenActive) {
            toggleSiren();
        }
        
        // Simulate emergency broadcast
        broadcastEmergencySignal();
    } else {
        btn.textContent = 'START EMERGENCY';
        status.textContent = 'INACTIVE';
        status.style.color = '#333';
        panel.classList.remove('emergency');
        
        // Stop siren when emergency is deactivated
        if (sirenActive) {
            toggleSiren();
        }
        
        stopEmergencyBroadcast();
    }
}

/**
 * Toggle siren sound for ambulance
 */
function toggleSiren() {
    sirenActive = !sirenActive;
    const btn = document.getElementById('siren-text');
    const status = document.getElementById('siren-status-text');
    const indicator = document.getElementById('siren-indicator');
    
    if (sirenActive) {
        btn.textContent = 'STOP SIREN';
        status.textContent = 'ON';
        status.style.color = '#ff4757';
        indicator.classList.add('active');
        startSiren();
    } else {
        btn.textContent = 'START SIREN';
        status.textContent = 'OFF';
        status.style.color = '#333';
        indicator.classList.remove('active');
        stopSiren();
    }
}

/**
 * Generate and play siren sound using Web Audio API
 */
function startSiren() {
    // Create audio context for siren sound
    if (!sirenSound) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            sirenSound = {
                context: audioContext,
                oscillator: null,
                gainNode: null,
                isPlaying: false
            };
        } catch (e) {
            console.log('Audio not supported:', e);
            return;
        }
    }

    if (!sirenSound.isPlaying) {
        const oscillator = sirenSound.context.createOscillator();
        const gainNode = sirenSound.context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(sirenSound.context.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, sirenSound.context.currentTime);
        gainNode.gain.setValueAtTime(0.1, sirenSound.context.currentTime);
        
        // Create siren effect - sweeping frequency
        let time = sirenSound.context.currentTime;
        for (let i = 0; i < 100; i++) {
            oscillator.frequency.setValueAtTime(800 + Math.sin(i * 0.5) * 400, time + i * 0.1);
        }
        
        oscillator.start();
        sirenSound.oscillator = oscillator;
        sirenSound.gainNode = gainNode;
        sirenSound.isPlaying = true;
        
        // Loop the siren
        setTimeout(() => {
            if (sirenActive) {
                stopSiren();
                setTimeout(() => {
                    if (sirenActive) startSiren();
                }, 100);
            }
        }, 3000);
    }
}

/**
 * Stop siren sound
 */
function stopSiren() {
    if (sirenSound && sirenSound.oscillator && sirenSound.isPlaying) {
        try {
            sirenSound.gainNode.gain.exponentialRampToValueAtTime(0.01, sirenSound.context.currentTime + 0.1);
            sirenSound.oscillator.stop(sirenSound.context.currentTime + 0.1);
        } catch (e) {
            console.log('Error stopping siren:', e);
        }
        sirenSound.isPlaying = false;
    }
}

/**
 * Share ambulance location with emergency dispatch
 */
function shareLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                document.getElementById('driver-location').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                
                // Simulate sharing location with emergency dispatch
                const locationData = {
                    latitude: lat,
                    longitude: lng,
                    accuracy: accuracy,
                    timestamp: new Date().toISOString(),
                    emergencyActive: emergencyActive,
                    sirenActive: sirenActive
                };
                
                console.log('Location shared with dispatch:', locationData);
                alert(`Location shared with emergency dispatch!\n\nLat: ${lat.toFixed(6)}\nLng: ${lng.toFixed(6)}\nAccuracy: ${accuracy.toFixed(0)}m\nTime: ${new Date().toLocaleTimeString()}`);
                
                // Store location for proximity calculations
                userLocation = { lat, lng };
            },
            (error) => {
                console.error('Geolocation error:', error);
                document.getElementById('driver-location').textContent = 'Location access denied';
                
                let errorMessage = 'Unable to get location: ';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out';
                        break;
                    default:
                        errorMessage += 'Unknown error occurred';
                        break;
                }
                alert(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        alert('Geolocation is not supported by this browser');
    }
}

/**
 * Enable/disable proximity alerts for local users
 */
function enableProximityAlert() {
    alertsEnabled = !alertsEnabled;
    const status = document.getElementById('alert-status');
    const btn = event.target;
    
    if (alertsEnabled) {
        status.textContent = 'ACTIVE';
        status.style.color = '#4ecdc4';
        btn.textContent = 'DISABLE ALERTS';
        btn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
        startProximityMonitoring();
    } else {
        status.textContent = 'INACTIVE';
        status.style.color = '#333';
        btn.textContent = 'ENABLE ALERTS';
        btn.style.background = 'linear-gradient(135deg, #42a5f5, #1e88e5)';
        stopProximityMonitoring();
    }
}

/**
 * Start tracking user location for local mode
 */
function startLocationTracking() {
    if (navigator.geolocation) {
        // Get initial position
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                document.getElementById('local-location').textContent = `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`;
            },
            (error) => {
                console.error('Location tracking error:', error);
                document.getElementById('local-location').textContent = 'Location access denied';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );

        // Watch position for continuous tracking
        if (navigator.geolocation.watchPosition) {
            navigator.geolocation.watchPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    document.getElementById('local-location').textContent = `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`;
                },
                (error) => {
                    console.error('Position watch error:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 30000
                }
            );
        }
    }
}

/**
 * Start monitoring for nearby ambulances
 */
function startProximityMonitoring() {
    if (proximityInterval) {
        clearInterval(proximityInterval);
    }
    
    proximityInterval = setInterval(() => {
        if (alertsEnabled && userLocation) {
            checkAmbulanceProximity();
        }
    }, 2000); // Check every 2 seconds
}

/**
 * Stop proximity monitoring
 */
function stopProximityMonitoring() {
    if (proximityInterval) {
        clearInterval(proximityInterval);
        proximityInterval = null;
    }
    hideProximityAlert();
    document.getElementById('distance-display').innerHTML = `
        <div style="color: #4ecdc4;">No Emergency Vehicles Nearby</div>
    `;
    document.getElementById('ambulance-distance').textContent = 'No ambulances detected';
}

/**
 * Check for nearby ambulances and trigger alerts
 */
function checkAmbulanceProximity() {
    if (!userLocation) return;
    
    // In a real app, this would fetch actual ambulance locations from a server
    // For demo, we simulate varying distances
    const simulatedDistance = 50 + Math.random() * 200; // Random distance between 50-250m
    const isApproaching = Math.random() > 0.7; // 30% chance of ambulance approaching
    
    if (isApproaching) {
        document.getElementById('ambulance-distance').textContent = `${simulatedDistance.toFixed(0)} meters`;
        
        if (simulatedDistance < 100) {
            showProximityAlert(simulatedDistance);
            document.getElementById('distance-display').innerHTML = `
                <div style="color: #ff4757;">🚨 AMBULANCE APPROACHING</div>
                <div style="font-size: 0.8em; margin-top: 10px;">${simulatedDistance.toFixed(0)} meters away</div>
            `;
        } else {
            hideProximityAlert();
            document.getElementById('distance-display').innerHTML = `
                <div style="color: #ffa726;">⚠️ AMBULANCE NEARBY</div>
                <div style="font-size: 0.8em; margin-top: 10px;">${simulatedDistance.toFixed(0)} meters away</div>
            `;
        }
    } else {
        hideProximityAlert();
        document.getElementById('distance-display').innerHTML = `
            <div style="color: #4ecdc4;">No Emergency Vehicles Nearby</div>
        `;
        document.getElementById('ambulance-distance').textContent = 'No ambulances detected';
    }
}

/**
 * Show proximity alert with sound
 * @param {number} distance - Distance to ambulance in meters
 */
function showProximityAlert(distance) {
    const alert = document.getElementById('proximity-alert');
    document.getElementById('alert-distance').textContent = `${distance.toFixed(0)} meters`;
    alert.classList.add('show');
    
    // Play alert sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // High-pitched alert sound
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
        
        // Additional beeps for closer distances
        if (distance < 50) {
            setTimeout(() => {
                const beep = audioContext.createOscillator();
                const beepGain = audioContext.createGain();
                beep.connect(beepGain);
                beepGain.connect(audioContext.destination);
                beep.frequency.setValueAtTime(1200, audioContext.currentTime);
                beepGain.gain.setValueAtTime(0.2, audioContext.currentTime);
                beepGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                beep.start();
                beep.stop(audioContext.currentTime + 0.3);
            }, 600);
        }
        
    } catch (e) {
        console.log('Audio alert not supported:', e);
    }
}

/**
 * Hide proximity alert
 */
function hideProximityAlert() {
    document.getElementById('proximity-alert').classList.remove('show');
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {Object} pos1 - First position {lat, lng}
 * @param {Object} pos2 - Second position {lat, lng}
 * @returns {number} Distance in meters
 */
function calculateDistance(pos1, pos2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.lat * Math.PI/180; // φ, λ in radians
    const φ2 = pos2.lat * Math.PI/180;
    const Δφ = (pos2.lat-pos1.lat) * Math.PI/180;
    const Δλ = (pos2.lng-pos1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

/**
 * Open Google Maps navigation
 */
function openNavigation() {
    if (userLocation) {
        const url = `https://www.google.com/maps/@${userLocation.lat},${userLocation.lng},15z`;
        window.open(url, '_blank');
    } else {
        alert('Please enable location access first to use navigation');
        startLocationTracking();
    }
}

/**
 * Simulate emergency signal broadcast (for demo purposes)
 */
function broadcastEmergencySignal() {
    console.log('Emergency signal broadcasting started');
    // In a real app, this would send signals to nearby devices
    // For demo, we just log the activity
}

/**
 * Stop emergency signal broadcast
 */
function stopEmergencyBroadcast() {
    console.log('Emergency signal broadcasting stopped');
}

/**
 * Handle browser compatibility and feature detection
 */
function checkBrowserSupport() {
    // Check geolocation support
    if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser');
        alert('Warning: Geolocation is not supported by your browser. Some features may not work.');
    }
    
    // Check Web Audio API support
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.warn('Web Audio API is not supported');
        alert('Warning: Audio features may not work in your browser.');
    }
    
    // Check for HTTPS (required for some features)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.warn('Some features require HTTPS to work properly');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Emergency Alert System initialized');
    
    // Check browser support
    checkBrowserSupport();
    
    // Start location tracking for driver mode by default
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                document.getElementById('driver-location').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                userLocation = { lat, lng };
            },
            (error) => {
                console.error('Initial location error:', error);
                document.getElementById('driver-location').textContent = 'Location access needed';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }
    
    // Add click handler to hide proximity alert
    document.getElementById('proximity-alert').addEventListener('click', function() {
        this.classList.remove('show');
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Emergency toggle with spacebar (only in driver mode)
        if (e.code === 'Space' && currentMode === 'driver') {
            e.preventDefault();
            toggleEmergency();
        }
        
        // Siren toggle with 'S' key (only in driver mode)
        if (e.code === 'KeyS' && currentMode === 'driver') {
            e.preventDefault();
            toggleSiren();
        }
        
        // Alert toggle with 'A' key (only in local mode)
        if (e.code === 'KeyA' && currentMode === 'local') {
            e.preventDefault();
            enableProximityAlert();
        }
    });
    
    console.log('Keyboard shortcuts enabled:');
    console.log('- Spacebar: Toggle Emergency (Driver Mode)');
    console.log('- S: Toggle Siren (Driver Mode)');
    console.log('- A: Toggle Alerts (Local Mode)');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, reduce activity
        console.log('App hidden, reducing background activity');
    } else {
        // Page is visible, resume normal activity
        console.log('App visible, resuming normal activity');
        if (alertsEnabled && currentMode === 'local') {
            startProximityMonitoring();
        }
    }
});

// Handle beforeunload to cleanup
window.addEventListener('beforeunload', function() {
    if (sirenActive) {
        stopSiren();
    }
    if (proximityInterval) {
        clearInterval(proximityInterval);
    }
});