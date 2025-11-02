/**
 * Asset URL Helper
 * Centralized utility for constructing asset URLs (drawings, notes images, etc.)
 * Uses the same environment configuration as ApiHelper
 */

// Get backend base URL (same logic as ApiHelper)
const getBackendBaseURL = () => {
  const env = import.meta.env.VITE_NODE_ENV || import.meta.env.VITE_NODE_ENV_BUILD || "development";
  const protocol = (env === "preprod" || env === "production") ? "https://" : "http://";
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "localhost:5000";
  return `${protocol}${backendUrl}`;
};

/**
 * Get asset URL for drawing specifications
 * @param {string} drawingId - Drawing ID
 * @param {string} fileId - File ID
 * @param {boolean} download - Whether this is a download URL
 * @returns {string} Complete asset URL
 */
export const getDrawingAssetUrl = (drawingId, fileId, download = false) => {
  const baseURL = getBackendBaseURL();
  const token = localStorage.getItem('asb-token');
  const url = `${baseURL}/api/assets/drawings/${drawingId}/files/${fileId}?token=${token}`;
  return download ? `${url}&download=true` : url;
};

/**
 * Get asset URL for notes images
 * @param {string} imageId - Image ID
 * @param {string} fileId - File ID
 * @param {boolean} download - Whether this is a download URL
 * @returns {string} Complete asset URL
 */
export const getNotesImageAssetUrl = (imageId, fileId, download = false) => {
  const baseURL = getBackendBaseURL();
  const token = localStorage.getItem('asb-token');
  const url = `${baseURL}/api/assets/notes-images/${imageId}/files/${fileId}?token=${token}`;
  return download ? `${url}&download=true` : url;
};

/**
 * Get base64 asset URL for drawing specifications
 * @param {string} drawingId - Drawing ID
 * @param {string} fileId - File ID
 * @param {boolean} rotate - Whether to rotate the image
 * @returns {string} Complete asset URL for base64 response
 */
export const getDrawingBase64Url = (drawingId, fileId, rotate = false) => {
  const baseURL = getBackendBaseURL();
  const token = localStorage.getItem('asb-token');
  const url = `${baseURL}/api/assets/drawings/${drawingId}/files/${fileId}/base64?token=${token}`;
  return rotate ? `${url}&rotate=true` : url;
};

/**
 * Get base64 asset URL for notes images
 * @param {string} imageId - Image ID
 * @param {string} fileId - File ID
 * @returns {string} Complete asset URL for base64 response
 */
export const getNotesImageBase64Url = (imageId, fileId) => {
  const baseURL = getBackendBaseURL();
  const token = localStorage.getItem('asb-token');
  return `${baseURL}/api/assets/notes-images/${imageId}/files/${fileId}/base64?token=${token}`;
};

