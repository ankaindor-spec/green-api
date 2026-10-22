import axios, { AxiosError, type AxiosInstance } from "axios";
import { HttpFailure, NetworkFailure } from "./errors";
import { isAbortError } from "@/shared/lib";

export type ApiCredentials = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
};

export type HttpMethod = "GET" | "POST" | "DELETE";

export type HttpResponse = {
  text: string;
  json: unknown;
};

export type HttpClient = {
  url(method: string, receiptId?: string): string;
  request(url: string, method: HttpMethod, body: unknown, signal?: AbortSignal): Promise<HttpResponse>;
};

export function createHttp(credentials: ApiCredentials): HttpClient {
  const client: AxiosInstance = axios.create({
    adapter: "fetch",
    responseType: "text",
    timeout: 0,
    withCredentials: false,
    withXSRFToken: false,
    transformResponse: [(data: unknown) => data],
    headers: {
      common: {
        Accept: false,
        "User-Agent": false,
        "Content-Type": "application/json",
      },
    },
    fetchOptions: {
      cache: "no-store",
    },
  });

  function url(method: string, receiptId?: string): string {
    const id = encodeURIComponent(credentials.idInstance);
    const token = encodeURIComponent(credentials.apiTokenInstance);
    const root = `${credentials.apiUrl}/waInstance${id}/${method}/${token}`;
    if (receiptId === undefined) return root;
    return `${root}/${encodeURIComponent(receiptId)}`;
  }

  async function request(
    requestUrl: string,
    method: HttpMethod,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<HttpResponse> {
    try {
      const response = await client.request<unknown>({
        url: requestUrl,
        method,
        data: body === undefined ? undefined : body,
        signal,
        responseType: "text",
        transformResponse: [(data: unknown) => data],
      });
      const text = asResponseText(response.data);
      return { text, json: parseBody(text) };
    } catch (error) {
      throw mapTransportError(error);
    }
  }

  return { url, request };
}

export function parseBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return text;
  }
}

function asResponseText(data: unknown): string {
  if (typeof data === "string") return data;
  if (data == null) return "";
  try {
    return JSON.stringify(data) ?? "";
  } catch {
    return "";
  }
}

function mapTransportError(error: unknown): unknown {
  if (isAbortError(error)) return error;
  if (!axios.isAxiosError(error)) return new NetworkFailure();
  if (error.code === AxiosError.ERR_CANCELED || error.name === "CanceledError") {
    return new DOMException("Aborted", "AbortError");
  }
  if (!error.response) return new NetworkFailure();
  const text = asResponseText(error.response.data);
  return new HttpFailure(error.response.status, parseBody(text));
}
