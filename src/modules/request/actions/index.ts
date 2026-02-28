"use server";

import db from "@/lib/db";
import { REST_METHOD } from "@prisma/client";

import axios, { AxiosRequestConfig } from "axios";
import { auditResponse, ResponseAuditParams } from "@/lib/ai-agents";

export type Request = {
  name: string;
  method: REST_METHOD;
  url: string;
  body?: string;
  headers?: string;
  parameters?: string;
};


export const addRequestToCollection = async (collectionId: string, value: Request) => {
  const request = await db.request.create({
    data: {
      collectionId,
      name: value.name,
      method: value.method,
      url: value.url,
      body: value.body,
      headers: value.headers,
      parameters: value.parameters,
    }
  });

  return request;
}



export const saveRequest = async (id: string, value: Request) => {

  console.log(value, id);
  const request = await db.request.update({
    where: {
      id: id
    },
    data: {
      name: value.name,
      method: value.method,
      url: value.url,
      body: value.body,
      headers: value.headers,
      parameters: value.parameters,
    },
  });

  return request;
}

export const getAllRequestFromCollection = async (collectionId: string) => {
  const requests = await db.request.findMany({
    where: {
      collectionId,
    },
  });
  return requests;
}



export async function sendRequest(req: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: any;
}) {
  const config: AxiosRequestConfig = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    params: req.params,
    data: req.body,
    validateStatus: () => true,
  };

  const start = performance.now();
  try {
    const res = await axios(config);
    const end = performance.now();

    const duration = end - start;
    const size =
      res.headers["content-length"] ||
      new TextEncoder().encode(JSON.stringify(res.data)).length;

    console.log(res.data);

    return {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(Object.entries(res.headers)),
      data: res.data,
      duration: Math.round(duration),
      size,
    };
  } catch (error: any) {
    const end = performance.now();
    return {
      error: error.message,
      duration: Math.round(end - start),
    };
  }
}


function parseSettings(settings: any): Record<string, string> {
  if (!settings) return {};
  try {
    const parsed = typeof settings === 'string' ? JSON.parse(settings) : settings;
    if (Array.isArray(parsed)) {
      return parsed.reduce((acc: Record<string, string>, item: any) => {
        if (item.enabled !== false && item.key) {
          acc[item.key] = item.value;
        }
        return acc;
      }, {});
    }
    return parsed;
  } catch (e) {
    console.error("Failed to parse settings:", e);
    return {};
  }
}

export async function run(requestId: string) {
  try {
    const request = await db.request.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new Error(`Request with id ${requestId} not found`);
    }

    const requestConfig = {
      method: request.method,
      url: request.url,
      headers: parseSettings(request.headers),
      params: parseSettings(request.parameters),
      body: request.body ? (typeof request.body === 'string' ? JSON.parse(request.body) : request.body) : undefined
    };

    const result = await sendRequest(requestConfig);

    const requestRun = await db.requestRun.create({
      data: {
        requestId: request.id,
        status: result.status || 0,
        statusText: result.statusText || (result.error ? 'Error' : null),
        headers: result.headers || {},
        body: result.data ? (typeof result.data === 'string' ? result.data : JSON.stringify(result.data)) : null,
        durationMs: result.duration || 0
      }
    });

    if (result.data && !result.error) {
      await db.request.update({
        where: { id: request.id },
        data: {
          response: result.data,
          updatedAt: new Date()
        }
      });
    }

    return {
      success: true,
      requestRun,
      result
    };

  } catch (error: any) {
    try {
      const failedRun = await db.requestRun.create({
        data: {
          requestId,
          status: 0,
          statusText: 'Failed',
          headers: {},
          body: error.message,
          durationMs: 0
        }
      });

      return {
        success: false,
        error: error.message,
        requestRun: failedRun
      };
    } catch (dbError) {
      return {
        success: false,
        error: `Request failed: ${error.message}. DB save failed: ${(dbError as Error).message}`
      };
    }
  }
}

export async function runDirect(requestData: {
  id?: string;
  method: string;
  url: string;
  headers?: any;
  parameters?: any;
  body?: any;
}) {
  try {
    const requestConfig = {
      method: requestData.method,
      url: requestData.url,
      headers: parseSettings(requestData.headers),
      params: parseSettings(requestData.parameters),
      body: requestData.body ? (typeof requestData.body === 'string' ? (requestData.body.trim() ? JSON.parse(requestData.body) : undefined) : requestData.body) : undefined
    };

    const result = await sendRequest(requestConfig);

    let requestRun = null;
    if (requestData.id) {
      requestRun = await db.requestRun.create({
        data: {
          requestId: requestData.id,
          status: result.status || 0,
          statusText: result.statusText || (result.error ? 'Error' : null),
          headers: result.headers || {},
          body: result.data ? (typeof result.data === 'string' ? result.data : JSON.stringify(result.data)) : null,
          durationMs: result.duration || 0
        }
      });

      if (result.data && !result.error) {
        await db.request.update({
          where: { id: requestData.id },
          data: {
            response: result.data,
            updatedAt: new Date()
          }
        });
      }
    } else {
      // For unsaved requests, we still need a valid structure for the response viewer
      requestRun = {
        id: "unsaved",
        status: result.status || 0,
        statusText: result.statusText || (result.error ? 'Error' : null),
        headers: result.headers || {},
        body: result.data ? (typeof result.data === 'string' ? result.data : JSON.stringify(result.data)) : null,
        durationMs: result.duration || 0,
        createdAt: new Date().toISOString()
      };
    }

    return {
      success: true,
      requestRun,
      result
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      requestRun: {
        id: "failed",
        status: 0,
        statusText: 'Failed',
        headers: "",
        body: error.message,
        durationMs: 0,
        createdAt: new Date().toISOString()
      }
    };
  }
}

export async function auditRequestAction(params: ResponseAuditParams) {
  return await auditResponse(params);
}
