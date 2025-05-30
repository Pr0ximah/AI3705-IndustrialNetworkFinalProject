import axios from "axios";

const service = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL,
  timeout: 10000, // Request timeout
});

export default service;
