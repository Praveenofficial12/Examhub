import { UserSession, LoginSessionRecord, MongoStatusInfo, SessionLocation } from '../types';

/**
 * Detect client laptop IP and geolocation
 */
export async function detectSessionDetails(): Promise<{
  ipAddress: string;
  location: SessionLocation;
  deviceInfo: {
    userAgent: string;
    platform: string;
    screenResolution: string;
    deviceType: string;
  };
}> {
  let detectedIp = '127.0.0.1';
  let locationData: SessionLocation = {
    city: 'Karur',
    region: 'Tamil Nadu',
    country: 'India',
    latitude: 10.9601,
    longitude: 78.0766,
    address: 'V.S.B. Engineering College Campus, Karur - 639 111',
    source: 'campus_default'
  };

  // 1. Try server endpoint first for client IP
  try {
    const res = await fetch('/api/client-ip');
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && data.ip !== '::1' && data.ip !== '127.0.0.1') {
        detectedIp = data.ip;
      }
    }
  } catch (e) {
    // ignore
  }

  // 2. If local or unknown IP, query public IP service
  if (detectedIp === '127.0.0.1' || detectedIp === '::1' || !detectedIp) {
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
      if (ipRes.ok) {
        const ipJson = await ipRes.json();
        if (ipJson?.ip) {
          detectedIp = ipJson.ip;
        }
      }
    } catch (e) {
      // fallback
    }
  }

  // 3. Try to get geolocation via browser navigator
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 3000,
          maximumAge: 60000,
          enableHighAccuracy: false
        });
      });

      if (pos?.coords) {
        locationData = {
          city: 'Karur Region',
          region: 'Tamil Nadu',
          country: 'India',
          latitude: parseFloat(pos.coords.latitude.toFixed(4)),
          longitude: parseFloat(pos.coords.longitude.toFixed(4)),
          address: `Geo-Coordinates: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`,
          source: 'geolocation'
        };
      }
    } catch (geoErr) {
      // User declined or timed out; use campus default
    }
  }

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Laptop Browser';
  const platform = typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform || navigator.platform || 'Laptop/PC' : 'Laptop';
  const screenResolution = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  return {
    ipAddress: detectedIp,
    location: locationData,
    deviceInfo: {
      userAgent,
      platform,
      screenResolution,
      deviceType: isMobile ? 'Mobile Device' : 'Laptop / Workstation'
    }
  };
}

/**
 * Record a user session to MongoDB via backend
 */
export async function recordLoginSessionToMongo(session: UserSession): Promise<{
  success: boolean;
  mongoStatus?: MongoStatusInfo;
  sessionRecord?: LoginSessionRecord;
}> {
  try {
    const details = await detectSessionDetails();

    const payload = {
      username: session.username,
      fullName: session.fullName,
      role: session.role,
      designation: session.designation,
      department: session.department || 'ALL',
      isAdmin: Boolean(session.isAdmin),
      token: session.token,
      loginTime: session.loginTime,
      clientIp: details.ipAddress,
      location: details.location,
      deviceInfo: details.deviceInfo
    };

    const res = await fetch('/api/sessions/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: data.success,
        mongoStatus: data.mongoStatus,
        sessionRecord: data.session
      };
    }
    return { success: false };
  } catch (err) {
    console.warn('[Session Tracker] Failed to record session to backend:', err);
    return { success: false };
  }
}

/**
 * Fetch past login sessions from MongoDB / backend
 */
export async function fetchLoginSessionsFromMongo(): Promise<{
  sessions: LoginSessionRecord[];
  source: string;
  mongoStatus?: MongoStatusInfo;
}> {
  try {
    const res = await fetch('/api/sessions');
    if (res.ok) {
      const data = await res.json();
      return {
        sessions: data.sessions || [],
        source: data.source || 'mongodb_atlas',
        mongoStatus: data.mongoStatus
      };
    }
  } catch (err) {
    console.error('Failed to fetch sessions:', err);
  }
  return { sessions: [], source: 'offline' };
}

/**
 * Check MongoDB connection status
 */
export async function checkMongoStatus(): Promise<MongoStatusInfo | null> {
  try {
    const res = await fetch('/api/system/mongo-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // ignore
  }
  return null;
}
