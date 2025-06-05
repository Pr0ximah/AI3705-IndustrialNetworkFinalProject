import axios from "axios";

const service = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL,
  timeout: 10000, // Request timeout
});

const FBB_service = axios.create({
  baseURL: process.env.VUE_APP_FBB_API_BASE_URL,
  timeout: 10000, // Request timeout
});

export { service, FBB_service };
