import { API_URL } from "./config";

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

  async post(endpoint, data, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          ...this.headers,
          ...options.headers,
        },
        signal: options.signal,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (response.status === 401) {
        window.location = "/login?loggedout=true";
        return { ok: false, status: 401, error: "Unauthorized" };
      }
      if (!response.ok) {
        return { status: response.status, ok: false, error: response.statusText };
      }
      const res = await response.json();
      return { ...res, status: response.status };
    } catch (error) {
      if (error.message.includes("NetworkError")) {
        return { ok: false, status: 401, error: "Unauthorized" };
      }
      throw error;
    }
  }

  async postFormData(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: this.headers.Authorization,
        },
        body: data,
        credentials: "include",
      });
      if (response.status === 401) {
        window.location = "/login?loggedout=true";
        return { ok: false, status: 401, error: "Unauthorized" };
      }
      return await response.json();
    } catch (error) {
      if (error.message.includes("NetworkError")) {
        return { ok: false, status: 401, error: "Unauthorized" };
      }
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "GET",
        headers: {
          ...this.headers,
          ...options.headers,
        },
        credentials: "include",
      });
      if (response.status === 401) {
        window.location = "/login?loggedout=true";
        return { ok: false, status: 401, error: "Unauthorized" };
      }
      const res = await response.json();
      return { ...res, status: response.status };
    } catch (error) {
      if (error.message.includes("NetworkError")) {
        return { ok: false, status: 401, error: "Unauthorized" };
      }
      throw error;
    }
  }

  async put(endpoint, data, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "PUT",
        headers: {
          ...this.headers,
          ...options.headers,
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (response.status === 401) {
        window.location = "/login?loggedout=true";
        return { ok: false, status: 401, error: "Unauthorized" };
      }
      const res = await response.json();
      return { ...res, status: response.status };
    } catch (error) {
      if (error.message.includes("NetworkError")) {
        return { ok: false, status: 401, error: "Unauthorized" };
      }
      throw error;
    }
  }

  async delete(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "DELETE",
        headers: {
          ...this.headers,
          ...options.headers,
        },
        credentials: "include",
      });
      if (response.status === 401) {
        window.location = "/login?loggedout=true";
        return { ok: false, status: 401, error: "Unauthorized" };
      }
      const res = await response.json();
      return { ...res, status: response.status };
    } catch (error) {
      if (error.message.includes("NetworkError")) {
        return { ok: false, status: 401, error: "Unauthorized" };
      }
      throw error;
    }
  }
}
const api = new APIHandler();
export default api;
