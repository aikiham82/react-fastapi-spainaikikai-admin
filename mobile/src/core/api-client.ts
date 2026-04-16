import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_BASE_URL = "https://admin.spainaikikai.org/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  let token: string | null = null;

  if (Platform.OS === "web") {
    token = localStorage.getItem("session");
  } else {
    token = await SecureStore.getItemAsync("session");
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — handled by auth context listener
    }
    return Promise.reject(error);
  }
);
