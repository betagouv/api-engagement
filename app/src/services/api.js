import { API_URL } from "./config";
import { generateRequestId, REQUEST_ID_HEADER } from "./requestId";

class APIHandler {
  constructor() {
    this.name = "APIHandler";
    this.baseUrl = API_URL;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token") ? `jwt ${localStorage.getItem("token")}` : "",
    };
  }

  setToken(token) {
    // Set token in headers
    localStorage.setItem("token", token);
    this.headers["Authorization"] = `jwt ${token}`;
  }

  removeToken() {
    // Remove token from headers
    localStorage.removeItem("token");
    this.headers["Authorization"] = "";
  }

  logout() {
    window.location = "/login?loggedout=true";
    localStorage.removeItem("token");
    this.headers["Authorization"] = "";
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  async post(endpoint, data, options = {}) {
    const requestId = generateRequestId();
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          ...this.headers,
          ...options.headers,
          [REQUEST_ID_HEADER]: requestId,
        },
        signal: options.signal,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (response.status === 401) {
        return this.logout();
      }
      const res = await response.json();
      return { ...res, status: response.status };
    } catch (error) {
      error.requestId = requestId;
      if (error.message.includes("NetworkError")) {
        return this.logout();
      }
      throw error;
    }
  }

  async postFormData(endpoint, data) {
    const requestId = generateRequestId();
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: this.headers.Authorization,
          [REQUEST_ID_HEADER]: requestId,
        },
        body: data,
        credentials: "include",
      });
      if (response.status === 401) {
        return this.logout();
      }
      const res = await response.json();
      return { ...res, status: response.status };
    } catch (error) {
      error.requestId = requestId;
      if (error.message.includes("NetworkError")) {
        return this.logout();
      }
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    const requestId = generateRequestId();
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "GET",
        headers: {
          ...this.headers,
          ...options.headers,
          [REQUEST_ID_HEADER]: requestId,
        },
        credentials: "include",
      });
      if (response.status === 401) {
        return this.logout();
      }
      const res = await response.json();
      return { ...res, status: response.status };
    } catch (error) {
      error.requestId = requestId;
      if (error.message.includes("NetworkError")) {
        return this.logout();
      }
      throw error;
    }
  }

  async put(endpoint, data, options = {}) {
    const requestId = generateRequestId();
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "PUT",
        headers: {
          ...this.headers,
          ...options.headers,
          [REQUEST_ID_HEADER]: requestId,
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (response.status === 401) {
        return this.logout();
      }
      const res = await response.json();
      return { ...res, status: response.status };
    } catch (error) {
      error.requestId = requestId;
      if (error.message.includes("NetworkError")) {
        return this.logout();
      }
      throw error;
    }
  }

  async delete(endpoint, options = {}) {
    const requestId = generateRequestId();
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "DELETE",
        headers: {
          ...this.headers,
          ...options.headers,
          [REQUEST_ID_HEADER]: requestId,
        },
        credentials: "include",
      });
      if (response.status === 401) {
        return this.logout();
      }
      const res = await response.json();
      return { ...res, status: response.status };
    } catch (error) {
      error.requestId = requestId;
      if (error.message.includes("NetworkError")) {
        return this.logout();
      }
      throw error;
    }
  }
}
const api = new APIHandler();
export default api;
