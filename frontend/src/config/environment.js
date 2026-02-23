/**
 * Environment Configuration
 * Automatically switches between local and production backend URLs.
 */

export const IS_DEV = __DEV__;
export const ENV_NAME = IS_DEV ? 'development' : 'production';

export const LOCAL_URL = 'http://192.168.1.2:3000/api';
export const PROD_URL = 'https://meetofy.in/wsp/api';

export const BASE_URL = IS_DEV ? LOCAL_URL : PROD_URL;

console.log(`[ENV] ${ENV_NAME} | BASE_URL: ${BASE_URL}`);
