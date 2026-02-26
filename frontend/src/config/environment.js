/**
 * Environment Configuration
 * Toggle between LOCAL and PRODUCTION backends below.
 */

const LOCAL_URL = 'http://192.168.1.2:3000/api';
const PROD_URL = 'https://meetofy.in/wsp/api';

// --- MANUALLY UNCOMMENT ONE OPTION TO SWITCH ---
// export const BASE_URL = 'http://10.236.52.216:3000/api'; // LOCAL (Your current IP)
// export const BASE_URL = 'http://192.168.1.2:3000/api';   // LOCAL (Current IP)
// export const BASE_URL = 'http://10.0.2.2:3000/api';    // LOCAL (Android Emulator)
// export const BASE_URL = 'http://localhost:3000/api';   // LOCAL (Web/iOS Simulator)
export const BASE_URL = 'https://meetofy.in/wsp/api';  // PRODUCTION
// ----------------------------------------------

export const IS_DEV = __DEV__;
export const ENV_NAME = IS_DEV ? 'development' : 'production';


console.log(`[ENV] ${ENV_NAME} | BASE_URL: ${BASE_URL}`);
