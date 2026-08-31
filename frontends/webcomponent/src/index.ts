export { VannaChat } from './components/vanna-chat.js';
export { VannaMessage, renderSafeMarkdown } from './components/vanna-message.js';
export {
  VannaApiClient,
  VannaApiError,
  apiClient,
  isChatStreamError,
  isChatStreamProgress,
  isCanonicalUserId,
  isSafeIdentifier,
  isSafeLink,
} from './services/api-client.js';
export type {
  ApiClientConfig,
  ChatRequest,
  ChatRequestHeaders,
  ChatResponse,
  ChatStreamChunk,
  ChatStreamError,
  ChatStreamPayload,
  ChatStreamProgress,
  DataFrameComponent,
  FileComponent,
  JsonScalar,
  ProgressStage,
  ProgressUpdate,
  TextComponent,
  VannaComponent,
} from './services/api-client.js';

declare const __BUILD_TIME__: string;
declare const __BUILD_VERSION__: string;

if (typeof console !== 'undefined') {
  console.info(`Vanna WebComponent ${__BUILD_VERSION__} (${__BUILD_TIME__})`);
}
