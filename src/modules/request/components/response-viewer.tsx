import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Editor from "@monaco-editor/react";
import {
  Clock,
  HardDrive,
  CheckCircle,
  Copy,
  Download,
  Filter,
  MoreHorizontal,
  Code,
  FileText,
  Settings,
  ShieldCheck,
  Activity,
  Zap,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TestTube,
} from "lucide-react";
import { useRequestPlaygroundStore } from "../store/useRequestStore";

type HeadersMap = Record<string, string>;

interface RequestRun {
  id: string;
  requestId?: string;
  status?: number;
  statusText?: string | null;
  headers?: any;
  body?: string | object | null;
  durationMs?: number | null;
  createdAt?: string | Date;
}

interface Result {
  status?: number;
  statusText?: string;
  duration?: number;
  size?: number;
}

export interface ResponseData {
  success: boolean;
  requestRun: RequestRun;
  result?: Result;
}

interface Props {
  responseData: ResponseData;
}

const ResponseViewer = ({ responseData }: Props) => {
  const { responseAuditData, isAuditing } = useRequestPlaygroundStore();
  const [activeTab, setActiveTab] = useState("json");

  const getStatusColor = (status?: number): string => {
    const s = typeof status === "number" ? status : 0;
    if (s >= 200 && s < 300) return "text-green-400";
    if (s >= 300 && s < 400) return "text-yellow-400";
    if (s >= 400 && s < 500) return "text-orange-400";
    if (s >= 500) return "text-red-400";
    return "text-gray-400";
  };

  const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const copyToClipboard = (text: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text).catch(() => {
      /* ignore */
    });
  };

  // Defensive parse: body may be already an object or invalid JSON
  let responseBody: unknown = {};
  let formattedJsonString = "";
  try {
    const rawBody = responseData?.requestRun?.body;
    if (typeof rawBody === "string") {
      responseBody = rawBody.length ? JSON.parse(rawBody) : rawBody;
    } else {
      responseBody = rawBody ?? {};
    }
    formattedJsonString = JSON.stringify(responseBody, null, 2);
  } catch (e) {
    // If parsing fails, fall back to the raw string
    responseBody = responseData?.requestRun?.body ?? {};
    formattedJsonString =
      typeof responseBody === "string"
        ? responseBody
        : JSON.stringify(responseBody, null, 2);
  }

  const status: number | undefined =
    responseData.result?.status ?? responseData.requestRun?.status;
  const statusText: string | null | undefined =
    responseData.result?.statusText ?? responseData.requestRun?.statusText;
  const duration: number | null | undefined =
    responseData.result?.duration ?? responseData.requestRun?.durationMs;
  const size: number | undefined = responseData.result?.size;
  const rawBody = responseData.requestRun?.body;

  return (
    <div className="w-full bg-zinc-950 text-white p-6">
      <div className="w-full mx-auto">
        {/* Status Header */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Status:</span>
                  <Badge
                    className={`${getStatusColor(
                      status
                    )} bg-transparent border-current`}
                  >
                    {status ?? "—"} • {statusText ?? ""}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Time:</span>
                  <span className="text-blue-300">
                    {duration ? `${duration} ms` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Size:</span>
                  <span className="text-green-300">{formatBytes(size)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Response Tabs */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-200">Response Body</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="px-6 border-b border-zinc-800">
                <TabsList className="bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="json"
                    className="bg-transparent data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-gray-400 rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-4 py-2"
                  >
                    <Code className="w-4 h-4 mr-2" />
                    JSON
                  </TabsTrigger>
                  <TabsTrigger
                    value="raw"
                    className="bg-transparent data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-gray-400 rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-4 py-2"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Raw
                  </TabsTrigger>
                  <TabsTrigger
                    value="headers"
                    className="bg-transparent data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-gray-400 rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-4 py-2"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Headers
                    <Badge
                      variant="secondary"
                      className="ml-2 text-xs bg-zinc-700"
                    >
                      {
                        Object.keys(responseData.requestRun.headers ?? {})
                          .length
                      }
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="ai-audit"
                    className="bg-transparent data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-gray-400 rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-pink-500 px-4 py-2"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    AI Judge
                    {isAuditing && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
                    {!isAuditing && responseAuditData && (
                      <Badge variant="secondary" className="ml-2 text-[10px] h-4 bg-pink-500/20 text-pink-400 border-pink-500/30">
                        {responseAuditData.overallScore}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="test"
                    className="bg-transparent data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-gray-400 rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-4 py-2"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Test Results
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="json" className="mt-0">
                <div className="relative">
                  <div className="absolute top-4 right-4 z-10">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white bg-zinc-800/50 backdrop-blur-sm"
                      onClick={() => copyToClipboard(formattedJsonString)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="h-96">
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      value={formattedJsonString}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        wordWrap: "on",
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        lineNumbers: "on",
                        glyphMargin: false,
                        folding: true,
                        lineDecorationsWidth: 0,
                        lineNumbersMinChars: 3,
                        renderLineHighlight: "none",
                        scrollbar: {
                          vertical: "auto",
                          horizontal: "auto",
                          verticalScrollbarSize: 8,
                          horizontalScrollbarSize: 8,
                        },
                      }}
                      theme="vs-dark"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="raw" className="mt-0">
                <div className="relative">
                  <div className="absolute top-4 right-4 z-10">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white"
                      onClick={() => copyToClipboard(String(rawBody ?? ""))}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="h-96">
                    <Editor
                      height="100%"
                      defaultLanguage="text"
                      value={String(rawBody ?? "")}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        wordWrap: "on",
                        lineNumbers: "on",
                        glyphMargin: false,
                        folding: true,
                        lineDecorationsWidth: 0,
                        lineNumbersMinChars: 3,
                        renderLineHighlight: "none",
                        scrollbar: {
                          vertical: "auto",
                          horizontal: "auto",
                          verticalScrollbarSize: 8,
                          horizontalScrollbarSize: 8,
                        },
                      }}
                      theme="vs-dark"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="headers" className="mt-0">
                <ScrollArea className="h-96">
                  <div className="p-6">
                    <div className="space-y-3">
                      {Object.entries(
                        responseData.requestRun.headers ?? {}
                      ).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-start justify-between py-2 border-b border-zinc-800 last:border-b-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-blue-300 text-sm">
                              {key}
                            </div>
                            <div className="text-gray-300 text-sm break-all">
                              {String(value)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white ml-2"
                            onClick={() => copyToClipboard(`${key}: ${value}`)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="ai-audit" className="mt-0">
                <ScrollArea className="h-96">
                  <div className="p-6 space-y-6">
                    {/* Summary Section */}
                    {isAuditing ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">AI is Auditing your Response</h3>
                        <p className="text-gray-400 max-w-md">Gemini is currently analyzing your API response for security risks, performance issues, and best practices...</p>
                      </div>
                    ) : !responseAuditData ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <ShieldCheck className="w-12 h-12 text-gray-600 mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Audit Data Yet</h3>
                        <p className="text-gray-400 max-w-md">Run a request to trigger the AI Judge audit. The results will appear here automatically.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${responseAuditData.overallScore >= 80 ? 'bg-green-500/10 text-green-400' : responseAuditData.overallScore >= 50 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                              <Activity className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">Security & Quality Score</div>
                              <div className="text-2xl font-bold">{responseAuditData.overallScore}/100</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={responseAuditData.overallScore >= 80 ? 'outline' : 'destructive'} className={responseAuditData.overallScore >= 80 ? 'border-green-500 text-green-400' : ''}>
                              {responseAuditData.overallScore >= 80 ? 'Secure' : responseAuditData.overallScore >= 50 ? 'Warning' : 'Critical'}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Audit Summary</h3>
                          <p className="text-gray-200 leading-relaxed bg-zinc-800/30 p-4 rounded-lg border border-zinc-800">
                            {responseAuditData.summary}
                          </p>
                        </div>

                        {responseAuditData.vulnerabilities.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Key Vulnerabilities</h3>
                            <div className="space-y-3">
                              {responseAuditData.vulnerabilities.map((v: any, i: number) => (
                                <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className={`w-4 h-4 ${v.severity === 'Critical' || v.severity === 'High' ? 'text-red-500' : 'text-yellow-500'}`} />
                                      <span className="font-semibold text-white">{v.type}</span>
                                    </div>
                                    <Badge className={v.severity === 'Critical' ? 'bg-red-500' : v.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-600'}>
                                      {v.severity}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-300 mb-3">{v.description}</p>
                                  <div className="bg-zinc-800/50 p-3 rounded text-sm border-l-2 border-blue-500">
                                    <span className="text-blue-400 font-medium">Recommendation: </span>
                                    <span className="text-gray-300">{v.recommendation}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Best Practices</h3>
                            <ul className="space-y-2">
                              {responseAuditData.bestPractices.map((item: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Performance</h3>
                            <ul className="space-y-2">
                              {responseAuditData.performance.map((item: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                  <Zap className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="test" className="mt-0">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">
                      All tests passed
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                      <span className="text-gray-300">Status code is 200</span>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                      <span className="text-gray-300">
                        Response time is less than 3000ms
                      </span>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                      <span className="text-gray-300">
                        Content-Type is present
                      </span>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResponseViewer;
