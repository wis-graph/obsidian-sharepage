"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a;
const obsidian = require("obsidian");
const DEFAULT_SETTINGS = {
  githubToken: "",
  repoOwner: "",
  repoName: "",
  branch: "main",
  customCss: ""
};
function getUserAgent() {
  if (typeof navigator === "object" && "userAgent" in navigator) {
    return navigator.userAgent;
  }
  if (typeof process === "object" && process.version !== void 0) {
    return `Node.js/${process.version.substr(1)} (${process.platform}; ${process.arch})`;
  }
  return "<environment undetectable>";
}
function register(state, name, method, options) {
  if (typeof method !== "function") {
    throw new Error("method for before hook must be a function");
  }
  if (!options) {
    options = {};
  }
  if (Array.isArray(name)) {
    return name.reverse().reduce((callback, name2) => {
      return register.bind(null, state, name2, callback, options);
    }, method)();
  }
  return Promise.resolve().then(() => {
    if (!state.registry[name]) {
      return method(options);
    }
    return state.registry[name].reduce((method2, registered) => {
      return registered.hook.bind(null, method2, options);
    }, method)();
  });
}
function addHook(state, kind, name, hook2) {
  const orig = hook2;
  if (!state.registry[name]) {
    state.registry[name] = [];
  }
  if (kind === "before") {
    hook2 = (method, options) => {
      return Promise.resolve().then(orig.bind(null, options)).then(method.bind(null, options));
    };
  }
  if (kind === "after") {
    hook2 = (method, options) => {
      let result;
      return Promise.resolve().then(method.bind(null, options)).then((result_) => {
        result = result_;
        return orig(result, options);
      }).then(() => {
        return result;
      });
    };
  }
  if (kind === "error") {
    hook2 = (method, options) => {
      return Promise.resolve().then(method.bind(null, options)).catch((error) => {
        return orig(error, options);
      });
    };
  }
  state.registry[name].push({
    hook: hook2,
    orig
  });
}
function removeHook(state, name, method) {
  if (!state.registry[name]) {
    return;
  }
  const index = state.registry[name].map((registered) => {
    return registered.orig;
  }).indexOf(method);
  if (index === -1) {
    return;
  }
  state.registry[name].splice(index, 1);
}
const bind = Function.bind;
const bindable = bind.bind(bind);
function bindApi(hook2, state, name) {
  const removeHookRef = bindable(removeHook, null).apply(
    null,
    [state]
  );
  hook2.api = { remove: removeHookRef };
  hook2.remove = removeHookRef;
  ["before", "error", "after", "wrap"].forEach((kind) => {
    const args = [state, kind];
    hook2[kind] = hook2.api[kind] = bindable(addHook, null).apply(null, args);
  });
}
function Collection() {
  const state = {
    registry: {}
  };
  const hook2 = register.bind(null, state);
  bindApi(hook2, state);
  return hook2;
}
const Hook = { Collection };
var VERSION$8 = "0.0.0-development";
var userAgent = `octokit-endpoint.js/${VERSION$8} ${getUserAgent()}`;
var DEFAULTS = {
  method: "GET",
  baseUrl: "https://api.github.com",
  headers: {
    accept: "application/vnd.github.v3+json",
    "user-agent": userAgent
  },
  mediaType: {
    format: ""
  }
};
function lowercaseKeys(object) {
  if (!object) {
    return {};
  }
  return Object.keys(object).reduce((newObj, key) => {
    newObj[key.toLowerCase()] = object[key];
    return newObj;
  }, {});
}
function isPlainObject$1(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
function mergeDeep(defaults, options) {
  const result = Object.assign({}, defaults);
  Object.keys(options).forEach((key) => {
    if (isPlainObject$1(options[key])) {
      if (!(key in defaults)) Object.assign(result, { [key]: options[key] });
      else result[key] = mergeDeep(defaults[key], options[key]);
    } else {
      Object.assign(result, { [key]: options[key] });
    }
  });
  return result;
}
function removeUndefinedProperties(obj) {
  for (const key in obj) {
    if (obj[key] === void 0) {
      delete obj[key];
    }
  }
  return obj;
}
function merge(defaults, route, options) {
  var _a2;
  if (typeof route === "string") {
    let [method, url] = route.split(" ");
    options = Object.assign(url ? { method, url } : { url: method }, options);
  } else {
    options = Object.assign({}, route);
  }
  options.headers = lowercaseKeys(options.headers);
  removeUndefinedProperties(options);
  removeUndefinedProperties(options.headers);
  const mergedOptions = mergeDeep(defaults || {}, options);
  if (options.url === "/graphql") {
    if (defaults && ((_a2 = defaults.mediaType.previews) == null ? void 0 : _a2.length)) {
      mergedOptions.mediaType.previews = defaults.mediaType.previews.filter(
        (preview) => !mergedOptions.mediaType.previews.includes(preview)
      ).concat(mergedOptions.mediaType.previews);
    }
    mergedOptions.mediaType.previews = (mergedOptions.mediaType.previews || []).map((preview) => preview.replace(/-preview/, ""));
  }
  return mergedOptions;
}
function addQueryParameters(url, parameters) {
  const separator = /\?/.test(url) ? "&" : "?";
  const names = Object.keys(parameters);
  if (names.length === 0) {
    return url;
  }
  return url + separator + names.map((name) => {
    if (name === "q") {
      return "q=" + parameters.q.split("+").map(encodeURIComponent).join("+");
    }
    return `${name}=${encodeURIComponent(parameters[name])}`;
  }).join("&");
}
var urlVariableRegex = /\{[^{}}]+\}/g;
function removeNonChars(variableName) {
  return variableName.replace(new RegExp("(?:^\\W+)|(?:(?<!\\W)\\W+$)", "g"), "").split(/,/);
}
function extractUrlVariableNames(url) {
  const matches = url.match(urlVariableRegex);
  if (!matches) {
    return [];
  }
  return matches.map(removeNonChars).reduce((a, b) => a.concat(b), []);
}
function omit(object, keysToOmit) {
  const result = { __proto__: null };
  for (const key of Object.keys(object)) {
    if (keysToOmit.indexOf(key) === -1) {
      result[key] = object[key];
    }
  }
  return result;
}
function encodeReserved(str) {
  return str.split(/(%[0-9A-Fa-f]{2})/g).map(function(part) {
    if (!/%[0-9A-Fa-f]/.test(part)) {
      part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
    }
    return part;
  }).join("");
}
function encodeUnreserved(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase();
  });
}
function encodeValue(operator, value, key) {
  value = operator === "+" || operator === "#" ? encodeReserved(value) : encodeUnreserved(value);
  if (key) {
    return encodeUnreserved(key) + "=" + value;
  } else {
    return value;
  }
}
function isDefined(value) {
  return value !== void 0 && value !== null;
}
function isKeyOperator(operator) {
  return operator === ";" || operator === "&" || operator === "?";
}
function getValues(context, operator, key, modifier) {
  var value = context[key], result = [];
  if (isDefined(value) && value !== "") {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      value = value.toString();
      if (modifier && modifier !== "*") {
        value = value.substring(0, parseInt(modifier, 10));
      }
      result.push(
        encodeValue(operator, value, isKeyOperator(operator) ? key : "")
      );
    } else {
      if (modifier === "*") {
        if (Array.isArray(value)) {
          value.filter(isDefined).forEach(function(value2) {
            result.push(
              encodeValue(operator, value2, isKeyOperator(operator) ? key : "")
            );
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined(value[k])) {
              result.push(encodeValue(operator, value[k], k));
            }
          });
        }
      } else {
        const tmp = [];
        if (Array.isArray(value)) {
          value.filter(isDefined).forEach(function(value2) {
            tmp.push(encodeValue(operator, value2));
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined(value[k])) {
              tmp.push(encodeUnreserved(k));
              tmp.push(encodeValue(operator, value[k].toString()));
            }
          });
        }
        if (isKeyOperator(operator)) {
          result.push(encodeUnreserved(key) + "=" + tmp.join(","));
        } else if (tmp.length !== 0) {
          result.push(tmp.join(","));
        }
      }
    }
  } else {
    if (operator === ";") {
      if (isDefined(value)) {
        result.push(encodeUnreserved(key));
      }
    } else if (value === "" && (operator === "&" || operator === "?")) {
      result.push(encodeUnreserved(key) + "=");
    } else if (value === "") {
      result.push("");
    }
  }
  return result;
}
function parseUrl(template) {
  return {
    expand: expand.bind(null, template)
  };
}
function expand(template, context) {
  var operators = ["+", "#", ".", "/", ";", "?", "&"];
  template = template.replace(
    /\{([^\{\}]+)\}|([^\{\}]+)/g,
    function(_, expression, literal) {
      if (expression) {
        let operator = "";
        const values = [];
        if (operators.indexOf(expression.charAt(0)) !== -1) {
          operator = expression.charAt(0);
          expression = expression.substr(1);
        }
        expression.split(/,/g).forEach(function(variable) {
          var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
          values.push(getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
        });
        if (operator && operator !== "+") {
          var separator = ",";
          if (operator === "?") {
            separator = "&";
          } else if (operator !== "#") {
            separator = operator;
          }
          return (values.length !== 0 ? operator : "") + values.join(separator);
        } else {
          return values.join(",");
        }
      } else {
        return encodeReserved(literal);
      }
    }
  );
  if (template === "/") {
    return template;
  } else {
    return template.replace(/\/$/, "");
  }
}
function parse(options) {
  var _a2;
  let method = options.method.toUpperCase();
  let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
  let headers = Object.assign({}, options.headers);
  let body;
  let parameters = omit(options, [
    "method",
    "baseUrl",
    "url",
    "headers",
    "request",
    "mediaType"
  ]);
  const urlVariableNames = extractUrlVariableNames(url);
  url = parseUrl(url).expand(parameters);
  if (!/^http/.test(url)) {
    url = options.baseUrl + url;
  }
  const omittedParameters = Object.keys(options).filter((option) => urlVariableNames.includes(option)).concat("baseUrl");
  const remainingParameters = omit(parameters, omittedParameters);
  const isBinaryRequest = /application\/octet-stream/i.test(headers.accept);
  if (!isBinaryRequest) {
    if (options.mediaType.format) {
      headers.accept = headers.accept.split(/,/).map(
        (format) => format.replace(
          /application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/,
          `application/vnd$1$2.${options.mediaType.format}`
        )
      ).join(",");
    }
    if (url.endsWith("/graphql")) {
      if ((_a2 = options.mediaType.previews) == null ? void 0 : _a2.length) {
        const previewsFromAcceptHeader = headers.accept.match(new RegExp("(?<![\\w-])[\\w-]+(?=-preview)", "g")) || [];
        headers.accept = previewsFromAcceptHeader.concat(options.mediaType.previews).map((preview) => {
          const format = options.mediaType.format ? `.${options.mediaType.format}` : "+json";
          return `application/vnd.github.${preview}-preview${format}`;
        }).join(",");
      }
    }
  }
  if (["GET", "HEAD"].includes(method)) {
    url = addQueryParameters(url, remainingParameters);
  } else {
    if ("data" in remainingParameters) {
      body = remainingParameters.data;
    } else {
      if (Object.keys(remainingParameters).length) {
        body = remainingParameters;
      }
    }
  }
  if (!headers["content-type"] && typeof body !== "undefined") {
    headers["content-type"] = "application/json; charset=utf-8";
  }
  if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") {
    body = "";
  }
  return Object.assign(
    { method, url, headers },
    typeof body !== "undefined" ? { body } : null,
    options.request ? { request: options.request } : null
  );
}
function endpointWithDefaults(defaults, route, options) {
  return parse(merge(defaults, route, options));
}
function withDefaults$2(oldDefaults, newDefaults) {
  const DEFAULTS2 = merge(oldDefaults, newDefaults);
  const endpoint2 = endpointWithDefaults.bind(null, DEFAULTS2);
  return Object.assign(endpoint2, {
    DEFAULTS: DEFAULTS2,
    defaults: withDefaults$2.bind(null, DEFAULTS2),
    merge: merge.bind(null, DEFAULTS2),
    parse
  });
}
var endpoint = withDefaults$2(null, DEFAULTS);
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
const NullObject = function NullObject2() {
};
NullObject.prototype = /* @__PURE__ */ Object.create(null);
const paramRE = /; *([!#$%&'*+.^\w`|~-]+)=("(?:[\v\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\v\u0020-\u00ff])*"|[!#$%&'*+.^\w`|~-]+) */gu;
const quotedPairRE = /\\([\v\u0020-\u00ff])/gu;
const mediaTypeRE = /^[!#$%&'*+.^\w|~-]+\/[!#$%&'*+.^\w|~-]+$/u;
const defaultContentType = { type: "", parameters: new NullObject() };
Object.freeze(defaultContentType.parameters);
Object.freeze(defaultContentType);
function safeParse(header) {
  if (typeof header !== "string") {
    return defaultContentType;
  }
  let index = header.indexOf(";");
  const type = index !== -1 ? header.slice(0, index).trim() : header.trim();
  if (mediaTypeRE.test(type) === false) {
    return defaultContentType;
  }
  const result = {
    type: type.toLowerCase(),
    parameters: new NullObject()
  };
  if (index === -1) {
    return result;
  }
  let key;
  let match;
  let value;
  paramRE.lastIndex = index;
  while (match = paramRE.exec(header)) {
    if (match.index !== index) {
      return defaultContentType;
    }
    index += match[0].length;
    key = match[1].toLowerCase();
    value = match[2];
    if (value[0] === '"') {
      value = value.slice(1, value.length - 1);
      quotedPairRE.test(value) && (value = value.replace(quotedPairRE, "$1"));
    }
    result.parameters[key] = value;
  }
  if (index !== header.length) {
    return defaultContentType;
  }
  return result;
}
var safeParse_1 = safeParse;
class RequestError extends Error {
  constructor(message, statusCode, options) {
    super(message);
    __publicField(this, "name");
    /**
     * http status code
     */
    __publicField(this, "status");
    /**
     * Request options that lead to the error.
     */
    __publicField(this, "request");
    /**
     * Response object if a response was received
     */
    __publicField(this, "response");
    this.name = "HttpError";
    this.status = Number.parseInt(statusCode);
    if (Number.isNaN(this.status)) {
      this.status = 0;
    }
    if ("response" in options) {
      this.response = options.response;
    }
    const requestCopy = Object.assign({}, options.request);
    if (options.request.headers.authorization) {
      requestCopy.headers = Object.assign({}, options.request.headers, {
        authorization: options.request.headers.authorization.replace(
          new RegExp("(?<! ) .*$"),
          " [REDACTED]"
        )
      });
    }
    requestCopy.url = requestCopy.url.replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]").replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
    this.request = requestCopy;
  }
}
var VERSION$7 = "9.2.4";
var defaults_default = {
  headers: {
    "user-agent": `octokit-request.js/${VERSION$7} ${getUserAgent()}`
  }
};
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
async function fetchWrapper(requestOptions) {
  var _a2, _b, _c, _d, _e;
  const fetch = ((_a2 = requestOptions.request) == null ? void 0 : _a2.fetch) || globalThis.fetch;
  if (!fetch) {
    throw new Error(
      "fetch is not set. Please pass a fetch implementation as new Octokit({ request: { fetch }}). Learn more at https://github.com/octokit/octokit.js/#fetch-missing"
    );
  }
  const log = ((_b = requestOptions.request) == null ? void 0 : _b.log) || console;
  const parseSuccessResponseBody = ((_c = requestOptions.request) == null ? void 0 : _c.parseSuccessResponseBody) !== false;
  const body = isPlainObject(requestOptions.body) || Array.isArray(requestOptions.body) ? JSON.stringify(requestOptions.body) : requestOptions.body;
  const requestHeaders = Object.fromEntries(
    Object.entries(requestOptions.headers).map(([name, value]) => [
      name,
      String(value)
    ])
  );
  let fetchResponse;
  try {
    fetchResponse = await fetch(requestOptions.url, {
      method: requestOptions.method,
      body,
      redirect: (_d = requestOptions.request) == null ? void 0 : _d.redirect,
      headers: requestHeaders,
      signal: (_e = requestOptions.request) == null ? void 0 : _e.signal,
      // duplex must be set if request.body is ReadableStream or Async Iterables.
      // See https://fetch.spec.whatwg.org/#dom-requestinit-duplex.
      ...requestOptions.body && { duplex: "half" }
    });
  } catch (error) {
    let message = "Unknown Error";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        error.status = 500;
        throw error;
      }
      message = error.message;
      if (error.name === "TypeError" && "cause" in error) {
        if (error.cause instanceof Error) {
          message = error.cause.message;
        } else if (typeof error.cause === "string") {
          message = error.cause;
        }
      }
    }
    const requestError = new RequestError(message, 500, {
      request: requestOptions
    });
    requestError.cause = error;
    throw requestError;
  }
  const status = fetchResponse.status;
  const url = fetchResponse.url;
  const responseHeaders = {};
  for (const [key, value] of fetchResponse.headers) {
    responseHeaders[key] = value;
  }
  const octokitResponse = {
    url,
    status,
    headers: responseHeaders,
    data: ""
  };
  if ("deprecation" in responseHeaders) {
    const matches = responseHeaders.link && responseHeaders.link.match(/<([^<>]+)>; rel="deprecation"/);
    const deprecationLink = matches && matches.pop();
    log.warn(
      `[@octokit/request] "${requestOptions.method} ${requestOptions.url}" is deprecated. It is scheduled to be removed on ${responseHeaders.sunset}${deprecationLink ? `. See ${deprecationLink}` : ""}`
    );
  }
  if (status === 204 || status === 205) {
    return octokitResponse;
  }
  if (requestOptions.method === "HEAD") {
    if (status < 400) {
      return octokitResponse;
    }
    throw new RequestError(fetchResponse.statusText, status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status === 304) {
    octokitResponse.data = await getResponseData(fetchResponse);
    throw new RequestError("Not modified", status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status >= 400) {
    octokitResponse.data = await getResponseData(fetchResponse);
    throw new RequestError(toErrorMessage(octokitResponse.data), status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  octokitResponse.data = parseSuccessResponseBody ? await getResponseData(fetchResponse) : fetchResponse.body;
  return octokitResponse;
}
async function getResponseData(response) {
  var _a2;
  const contentType = response.headers.get("content-type");
  if (!contentType) {
    return response.text().catch(() => "");
  }
  const mimetype = safeParse_1(contentType);
  if (isJSONResponse(mimetype)) {
    let text = "";
    try {
      text = await response.text();
      return JSON.parse(text);
    } catch (err) {
      return text;
    }
  } else if (mimetype.type.startsWith("text/") || ((_a2 = mimetype.parameters.charset) == null ? void 0 : _a2.toLowerCase()) === "utf-8") {
    return response.text().catch(() => "");
  } else {
    return response.arrayBuffer().catch(() => new ArrayBuffer(0));
  }
}
function isJSONResponse(mimetype) {
  return mimetype.type === "application/json" || mimetype.type === "application/scim+json";
}
function toErrorMessage(data) {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return "Unknown error";
  }
  if ("message" in data) {
    const suffix = "documentation_url" in data ? ` - ${data.documentation_url}` : "";
    return Array.isArray(data.errors) ? `${data.message}: ${data.errors.map((v) => JSON.stringify(v)).join(", ")}${suffix}` : `${data.message}${suffix}`;
  }
  return `Unknown error: ${JSON.stringify(data)}`;
}
function withDefaults$1(oldEndpoint, newDefaults) {
  const endpoint2 = oldEndpoint.defaults(newDefaults);
  const newApi = function(route, parameters) {
    const endpointOptions = endpoint2.merge(route, parameters);
    if (!endpointOptions.request || !endpointOptions.request.hook) {
      return fetchWrapper(endpoint2.parse(endpointOptions));
    }
    const request2 = (route2, parameters2) => {
      return fetchWrapper(
        endpoint2.parse(endpoint2.merge(route2, parameters2))
      );
    };
    Object.assign(request2, {
      endpoint: endpoint2,
      defaults: withDefaults$1.bind(null, endpoint2)
    });
    return endpointOptions.request.hook(request2, endpointOptions);
  };
  return Object.assign(newApi, {
    endpoint: endpoint2,
    defaults: withDefaults$1.bind(null, endpoint2)
  });
}
var request = withDefaults$1(endpoint, defaults_default);
var VERSION$6 = "0.0.0-development";
function _buildMessageForResponseErrors(data) {
  return `Request failed due to following response errors:
` + data.errors.map((e) => ` - ${e.message}`).join("\n");
}
var GraphqlResponseError = class extends Error {
  constructor(request2, headers, response) {
    super(_buildMessageForResponseErrors(response));
    __publicField(this, "name", "GraphqlResponseError");
    __publicField(this, "errors");
    __publicField(this, "data");
    this.request = request2;
    this.headers = headers;
    this.response = response;
    this.errors = response.errors;
    this.data = response.data;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
};
var NON_VARIABLE_OPTIONS = [
  "method",
  "baseUrl",
  "url",
  "headers",
  "request",
  "query",
  "mediaType",
  "operationName"
];
var FORBIDDEN_VARIABLE_OPTIONS = ["query", "method", "url"];
var GHES_V3_SUFFIX_REGEX = /\/api\/v3\/?$/;
function graphql(request2, query, options) {
  if (options) {
    if (typeof query === "string" && "query" in options) {
      return Promise.reject(
        new Error(`[@octokit/graphql] "query" cannot be used as variable name`)
      );
    }
    for (const key in options) {
      if (!FORBIDDEN_VARIABLE_OPTIONS.includes(key)) continue;
      return Promise.reject(
        new Error(
          `[@octokit/graphql] "${key}" cannot be used as variable name`
        )
      );
    }
  }
  const parsedOptions = typeof query === "string" ? Object.assign({ query }, options) : query;
  const requestOptions = Object.keys(
    parsedOptions
  ).reduce((result, key) => {
    if (NON_VARIABLE_OPTIONS.includes(key)) {
      result[key] = parsedOptions[key];
      return result;
    }
    if (!result.variables) {
      result.variables = {};
    }
    result.variables[key] = parsedOptions[key];
    return result;
  }, {});
  const baseUrl = parsedOptions.baseUrl || request2.endpoint.DEFAULTS.baseUrl;
  if (GHES_V3_SUFFIX_REGEX.test(baseUrl)) {
    requestOptions.url = baseUrl.replace(GHES_V3_SUFFIX_REGEX, "/api/graphql");
  }
  return request2(requestOptions).then((response) => {
    if (response.data.errors) {
      const headers = {};
      for (const key of Object.keys(response.headers)) {
        headers[key] = response.headers[key];
      }
      throw new GraphqlResponseError(
        requestOptions,
        headers,
        response.data
      );
    }
    return response.data.data;
  });
}
function withDefaults(request2, newDefaults) {
  const newRequest = request2.defaults(newDefaults);
  const newApi = (query, options) => {
    return graphql(newRequest, query, options);
  };
  return Object.assign(newApi, {
    defaults: withDefaults.bind(null, newRequest),
    endpoint: newRequest.endpoint
  });
}
withDefaults(request, {
  headers: {
    "user-agent": `octokit-graphql.js/${VERSION$6} ${getUserAgent()}`
  },
  method: "POST",
  url: "/graphql"
});
function withCustomRequest(customRequest) {
  return withDefaults(customRequest, {
    method: "POST",
    url: "/graphql"
  });
}
var b64url = "(?:[a-zA-Z0-9_-]+)";
var sep = "\\.";
var jwtRE = new RegExp(`^${b64url}${sep}${b64url}${sep}${b64url}$`);
var isJWT = jwtRE.test.bind(jwtRE);
async function auth(token) {
  const isApp = isJWT(token);
  const isInstallation = token.startsWith("v1.") || token.startsWith("ghs_");
  const isUserToServer = token.startsWith("ghu_");
  const tokenType = isApp ? "app" : isInstallation ? "installation" : isUserToServer ? "user-to-server" : "oauth";
  return {
    type: "token",
    token,
    tokenType
  };
}
function withAuthorizationPrefix(token) {
  if (token.split(/\./).length === 3) {
    return `bearer ${token}`;
  }
  return `token ${token}`;
}
async function hook(token, request2, route, parameters) {
  const endpoint2 = request2.endpoint.merge(
    route,
    parameters
  );
  endpoint2.headers.authorization = withAuthorizationPrefix(token);
  return request2(endpoint2);
}
var createTokenAuth = function createTokenAuth2(token) {
  if (!token) {
    throw new Error("[@octokit/auth-token] No token passed to createTokenAuth");
  }
  if (typeof token !== "string") {
    throw new Error(
      "[@octokit/auth-token] Token passed to createTokenAuth is not a string"
    );
  }
  token = token.replace(/^(token|bearer) +/i, "");
  return Object.assign(auth.bind(null, token), {
    hook: hook.bind(null, token)
  });
};
const VERSION$5 = "6.1.6";
const noop$1 = () => {
};
const consoleWarn = console.warn.bind(console);
const consoleError = console.error.bind(console);
function createLogger(logger = {}) {
  if (typeof logger.debug !== "function") {
    logger.debug = noop$1;
  }
  if (typeof logger.info !== "function") {
    logger.info = noop$1;
  }
  if (typeof logger.warn !== "function") {
    logger.warn = consoleWarn;
  }
  if (typeof logger.error !== "function") {
    logger.error = consoleError;
  }
  return logger;
}
const userAgentTrail = `octokit-core.js/${VERSION$5} ${getUserAgent()}`;
let Octokit$1 = (_a = class {
  constructor(options = {}) {
    // assigned during constructor
    __publicField(this, "request");
    __publicField(this, "graphql");
    __publicField(this, "log");
    __publicField(this, "hook");
    // TODO: type `octokit.auth` based on passed options.authStrategy
    __publicField(this, "auth");
    const hook2 = new Hook.Collection();
    const requestDefaults = {
      baseUrl: request.endpoint.DEFAULTS.baseUrl,
      headers: {},
      request: Object.assign({}, options.request, {
        // @ts-ignore internal usage only, no need to type
        hook: hook2.bind(null, "request")
      }),
      mediaType: {
        previews: [],
        format: ""
      }
    };
    requestDefaults.headers["user-agent"] = options.userAgent ? `${options.userAgent} ${userAgentTrail}` : userAgentTrail;
    if (options.baseUrl) {
      requestDefaults.baseUrl = options.baseUrl;
    }
    if (options.previews) {
      requestDefaults.mediaType.previews = options.previews;
    }
    if (options.timeZone) {
      requestDefaults.headers["time-zone"] = options.timeZone;
    }
    this.request = request.defaults(requestDefaults);
    this.graphql = withCustomRequest(this.request).defaults(requestDefaults);
    this.log = createLogger(options.log);
    this.hook = hook2;
    if (!options.authStrategy) {
      if (!options.auth) {
        this.auth = async () => ({
          type: "unauthenticated"
        });
      } else {
        const auth2 = createTokenAuth(options.auth);
        hook2.wrap("request", auth2.hook);
        this.auth = auth2;
      }
    } else {
      const { authStrategy, ...otherOptions } = options;
      const auth2 = authStrategy(
        Object.assign(
          {
            request: this.request,
            log: this.log,
            // we pass the current octokit instance as well as its constructor options
            // to allow for authentication strategies that return a new octokit instance
            // that shares the same internal state as the current one. The original
            // requirement for this was the "event-octokit" authentication strategy
            // of https://github.com/probot/octokit-auth-probot.
            octokit: this,
            octokitOptions: otherOptions
          },
          options.auth
        )
      );
      hook2.wrap("request", auth2.hook);
      this.auth = auth2;
    }
    const classConstructor = this.constructor;
    for (let i = 0; i < classConstructor.plugins.length; ++i) {
      Object.assign(this, classConstructor.plugins[i](this, options));
    }
  }
  static defaults(defaults) {
    const OctokitWithDefaults = class extends this {
      constructor(...args) {
        const options = args[0] || {};
        if (typeof defaults === "function") {
          super(defaults(options));
          return;
        }
        super(
          Object.assign(
            {},
            defaults,
            options,
            options.userAgent && defaults.userAgent ? {
              userAgent: `${options.userAgent} ${defaults.userAgent}`
            } : null
          )
        );
      }
    };
    return OctokitWithDefaults;
  }
  /**
   * Attach a plugin (or many) to your Octokit instance.
   *
   * @example
   * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
   */
  static plugin(...newPlugins) {
    var _a2;
    const currentPlugins = this.plugins;
    const NewOctokit = (_a2 = class extends this {
    }, __publicField(_a2, "plugins", currentPlugins.concat(
      newPlugins.filter((plugin) => !currentPlugins.includes(plugin))
    )), _a2);
    return NewOctokit;
  }
}, __publicField(_a, "VERSION", VERSION$5), __publicField(_a, "plugins", []), _a);
var VERSION$4 = "0.0.0-development";
function normalizePaginatedListResponse(response) {
  if (!response.data) {
    return {
      ...response,
      data: []
    };
  }
  const responseNeedsNormalization = "total_count" in response.data && !("url" in response.data);
  if (!responseNeedsNormalization) return response;
  const incompleteResults = response.data.incomplete_results;
  const repositorySelection = response.data.repository_selection;
  const totalCount = response.data.total_count;
  delete response.data.incomplete_results;
  delete response.data.repository_selection;
  delete response.data.total_count;
  const namespaceKey = Object.keys(response.data)[0];
  const data = response.data[namespaceKey];
  response.data = data;
  if (typeof incompleteResults !== "undefined") {
    response.data.incomplete_results = incompleteResults;
  }
  if (typeof repositorySelection !== "undefined") {
    response.data.repository_selection = repositorySelection;
  }
  response.data.total_count = totalCount;
  return response;
}
function iterator(octokit, route, parameters) {
  const options = typeof route === "function" ? route.endpoint(parameters) : octokit.request.endpoint(route, parameters);
  const requestMethod = typeof route === "function" ? route : octokit.request;
  const method = options.method;
  const headers = options.headers;
  let url = options.url;
  return {
    [Symbol.asyncIterator]: () => ({
      async next() {
        if (!url) return { done: true };
        try {
          const response = await requestMethod({ method, url, headers });
          const normalizedResponse = normalizePaginatedListResponse(response);
          url = ((normalizedResponse.headers.link || "").match(
            /<([^<>]+)>;\s*rel="next"/
          ) || [])[1];
          return { value: normalizedResponse };
        } catch (error) {
          if (error.status !== 409) throw error;
          url = "";
          return {
            value: {
              status: 200,
              headers: {},
              data: []
            }
          };
        }
      }
    })
  };
}
function paginate(octokit, route, parameters, mapFn) {
  if (typeof parameters === "function") {
    mapFn = parameters;
    parameters = void 0;
  }
  return gather(
    octokit,
    [],
    iterator(octokit, route, parameters)[Symbol.asyncIterator](),
    mapFn
  );
}
function gather(octokit, results, iterator2, mapFn) {
  return iterator2.next().then((result) => {
    if (result.done) {
      return results;
    }
    let earlyExit = false;
    function done() {
      earlyExit = true;
    }
    results = results.concat(
      mapFn ? mapFn(result.value, done) : result.value.data
    );
    if (earlyExit) {
      return results;
    }
    return gather(octokit, results, iterator2, mapFn);
  });
}
Object.assign(paginate, {
  iterator
});
function paginateRest(octokit) {
  return {
    paginate: Object.assign(paginate.bind(null, octokit), {
      iterator: iterator.bind(null, octokit)
    })
  };
}
paginateRest.VERSION = VERSION$4;
var generateMessage = (path, cursorValue) => `The cursor at "${path.join(
  ","
)}" did not change its value "${cursorValue}" after a page transition. Please make sure your that your query is set up correctly.`;
var MissingCursorChange = class extends Error {
  constructor(pageInfo, cursorValue) {
    super(generateMessage(pageInfo.pathInQuery, cursorValue));
    __publicField(this, "name", "MissingCursorChangeError");
    this.pageInfo = pageInfo;
    this.cursorValue = cursorValue;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
};
var MissingPageInfo = class extends Error {
  constructor(response) {
    super(
      `No pageInfo property found in response. Please make sure to specify the pageInfo in your query. Response-Data: ${JSON.stringify(
        response,
        null,
        2
      )}`
    );
    __publicField(this, "name", "MissingPageInfo");
    this.response = response;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
};
var isObject = (value) => Object.prototype.toString.call(value) === "[object Object]";
function findPaginatedResourcePath(responseData) {
  const paginatedResourcePath = deepFindPathToProperty(
    responseData,
    "pageInfo"
  );
  if (paginatedResourcePath.length === 0) {
    throw new MissingPageInfo(responseData);
  }
  return paginatedResourcePath;
}
var deepFindPathToProperty = (object, searchProp, path = []) => {
  for (const key of Object.keys(object)) {
    const currentPath = [...path, key];
    const currentValue = object[key];
    if (isObject(currentValue)) {
      if (currentValue.hasOwnProperty(searchProp)) {
        return currentPath;
      }
      const result = deepFindPathToProperty(
        currentValue,
        searchProp,
        currentPath
      );
      if (result.length > 0) {
        return result;
      }
    }
  }
  return [];
};
var get = (object, path) => {
  return path.reduce((current, nextProperty) => current[nextProperty], object);
};
var set = (object, path, mutator) => {
  const lastProperty = path[path.length - 1];
  const parentPath = [...path].slice(0, -1);
  const parent = get(object, parentPath);
  if (typeof mutator === "function") {
    parent[lastProperty] = mutator(parent[lastProperty]);
  } else {
    parent[lastProperty] = mutator;
  }
};
var extractPageInfos = (responseData) => {
  const pageInfoPath = findPaginatedResourcePath(responseData);
  return {
    pathInQuery: pageInfoPath,
    pageInfo: get(responseData, [...pageInfoPath, "pageInfo"])
  };
};
var isForwardSearch = (givenPageInfo) => {
  return givenPageInfo.hasOwnProperty("hasNextPage");
};
var getCursorFrom = (pageInfo) => isForwardSearch(pageInfo) ? pageInfo.endCursor : pageInfo.startCursor;
var hasAnotherPage = (pageInfo) => isForwardSearch(pageInfo) ? pageInfo.hasNextPage : pageInfo.hasPreviousPage;
var createIterator = (octokit) => {
  return (query, initialParameters = {}) => {
    let nextPageExists = true;
    let parameters = { ...initialParameters };
    return {
      [Symbol.asyncIterator]: () => ({
        async next() {
          if (!nextPageExists) return { done: true, value: {} };
          const response = await octokit.graphql(
            query,
            parameters
          );
          const pageInfoContext = extractPageInfos(response);
          const nextCursorValue = getCursorFrom(pageInfoContext.pageInfo);
          nextPageExists = hasAnotherPage(pageInfoContext.pageInfo);
          if (nextPageExists && nextCursorValue === parameters.cursor) {
            throw new MissingCursorChange(pageInfoContext, nextCursorValue);
          }
          parameters = {
            ...parameters,
            cursor: nextCursorValue
          };
          return { done: false, value: response };
        }
      })
    };
  };
};
var mergeResponses = (response1, response2) => {
  if (Object.keys(response1).length === 0) {
    return Object.assign(response1, response2);
  }
  const path = findPaginatedResourcePath(response1);
  const nodesPath = [...path, "nodes"];
  const newNodes = get(response2, nodesPath);
  if (newNodes) {
    set(response1, nodesPath, (values) => {
      return [...values, ...newNodes];
    });
  }
  const edgesPath = [...path, "edges"];
  const newEdges = get(response2, edgesPath);
  if (newEdges) {
    set(response1, edgesPath, (values) => {
      return [...values, ...newEdges];
    });
  }
  const pageInfoPath = [...path, "pageInfo"];
  set(response1, pageInfoPath, get(response2, pageInfoPath));
  return response1;
};
var createPaginate = (octokit) => {
  const iterator2 = createIterator(octokit);
  return async (query, initialParameters = {}) => {
    let mergedResponse = {};
    for await (const response of iterator2(
      query,
      initialParameters
    )) {
      mergedResponse = mergeResponses(mergedResponse, response);
    }
    return mergedResponse;
  };
};
function paginateGraphQL(octokit) {
  return {
    graphql: Object.assign(octokit.graphql, {
      paginate: Object.assign(createPaginate(octokit), {
        iterator: createIterator(octokit)
      })
    })
  };
}
const VERSION$3 = "14.0.0";
const Endpoints = {
  actions: {
    addCustomLabelsToSelfHostedRunnerForOrg: [
      "POST /orgs/{org}/actions/runners/{runner_id}/labels"
    ],
    addCustomLabelsToSelfHostedRunnerForRepo: [
      "POST /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
    ],
    addRepoAccessToSelfHostedRunnerGroupInOrg: [
      "PUT /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}"
    ],
    addSelectedRepoToOrgSecret: [
      "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"
    ],
    addSelectedRepoToOrgVariable: [
      "PUT /orgs/{org}/actions/variables/{name}/repositories/{repository_id}"
    ],
    approveWorkflowRun: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve"
    ],
    cancelWorkflowRun: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel"
    ],
    createEnvironmentVariable: [
      "POST /repos/{owner}/{repo}/environments/{environment_name}/variables"
    ],
    createHostedRunnerForOrg: ["POST /orgs/{org}/actions/hosted-runners"],
    createOrUpdateEnvironmentSecret: [
      "PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
    ],
    createOrUpdateOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}"],
    createOrUpdateRepoSecret: [
      "PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}"
    ],
    createOrgVariable: ["POST /orgs/{org}/actions/variables"],
    createRegistrationTokenForOrg: [
      "POST /orgs/{org}/actions/runners/registration-token"
    ],
    createRegistrationTokenForRepo: [
      "POST /repos/{owner}/{repo}/actions/runners/registration-token"
    ],
    createRemoveTokenForOrg: ["POST /orgs/{org}/actions/runners/remove-token"],
    createRemoveTokenForRepo: [
      "POST /repos/{owner}/{repo}/actions/runners/remove-token"
    ],
    createRepoVariable: ["POST /repos/{owner}/{repo}/actions/variables"],
    createWorkflowDispatch: [
      "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches"
    ],
    deleteActionsCacheById: [
      "DELETE /repos/{owner}/{repo}/actions/caches/{cache_id}"
    ],
    deleteActionsCacheByKey: [
      "DELETE /repos/{owner}/{repo}/actions/caches{?key,ref}"
    ],
    deleteArtifact: [
      "DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"
    ],
    deleteEnvironmentSecret: [
      "DELETE /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
    ],
    deleteEnvironmentVariable: [
      "DELETE /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
    ],
    deleteHostedRunnerForOrg: [
      "DELETE /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
    ],
    deleteOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}"],
    deleteOrgVariable: ["DELETE /orgs/{org}/actions/variables/{name}"],
    deleteRepoSecret: [
      "DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}"
    ],
    deleteRepoVariable: [
      "DELETE /repos/{owner}/{repo}/actions/variables/{name}"
    ],
    deleteSelfHostedRunnerFromOrg: [
      "DELETE /orgs/{org}/actions/runners/{runner_id}"
    ],
    deleteSelfHostedRunnerFromRepo: [
      "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}"
    ],
    deleteWorkflowRun: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}"],
    deleteWorkflowRunLogs: [
      "DELETE /repos/{owner}/{repo}/actions/runs/{run_id}/logs"
    ],
    disableSelectedRepositoryGithubActionsOrganization: [
      "DELETE /orgs/{org}/actions/permissions/repositories/{repository_id}"
    ],
    disableWorkflow: [
      "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable"
    ],
    downloadArtifact: [
      "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}"
    ],
    downloadJobLogsForWorkflowRun: [
      "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs"
    ],
    downloadWorkflowRunAttemptLogs: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs"
    ],
    downloadWorkflowRunLogs: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs"
    ],
    enableSelectedRepositoryGithubActionsOrganization: [
      "PUT /orgs/{org}/actions/permissions/repositories/{repository_id}"
    ],
    enableWorkflow: [
      "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable"
    ],
    forceCancelWorkflowRun: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel"
    ],
    generateRunnerJitconfigForOrg: [
      "POST /orgs/{org}/actions/runners/generate-jitconfig"
    ],
    generateRunnerJitconfigForRepo: [
      "POST /repos/{owner}/{repo}/actions/runners/generate-jitconfig"
    ],
    getActionsCacheList: ["GET /repos/{owner}/{repo}/actions/caches"],
    getActionsCacheUsage: ["GET /repos/{owner}/{repo}/actions/cache/usage"],
    getActionsCacheUsageByRepoForOrg: [
      "GET /orgs/{org}/actions/cache/usage-by-repository"
    ],
    getActionsCacheUsageForOrg: ["GET /orgs/{org}/actions/cache/usage"],
    getAllowedActionsOrganization: [
      "GET /orgs/{org}/actions/permissions/selected-actions"
    ],
    getAllowedActionsRepository: [
      "GET /repos/{owner}/{repo}/actions/permissions/selected-actions"
    ],
    getArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
    getCustomOidcSubClaimForRepo: [
      "GET /repos/{owner}/{repo}/actions/oidc/customization/sub"
    ],
    getEnvironmentPublicKey: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key"
    ],
    getEnvironmentSecret: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
    ],
    getEnvironmentVariable: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
    ],
    getGithubActionsDefaultWorkflowPermissionsOrganization: [
      "GET /orgs/{org}/actions/permissions/workflow"
    ],
    getGithubActionsDefaultWorkflowPermissionsRepository: [
      "GET /repos/{owner}/{repo}/actions/permissions/workflow"
    ],
    getGithubActionsPermissionsOrganization: [
      "GET /orgs/{org}/actions/permissions"
    ],
    getGithubActionsPermissionsRepository: [
      "GET /repos/{owner}/{repo}/actions/permissions"
    ],
    getHostedRunnerForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
    ],
    getHostedRunnersGithubOwnedImagesForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/images/github-owned"
    ],
    getHostedRunnersLimitsForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/limits"
    ],
    getHostedRunnersMachineSpecsForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/machine-sizes"
    ],
    getHostedRunnersPartnerImagesForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/images/partner"
    ],
    getHostedRunnersPlatformsForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/platforms"
    ],
    getJobForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}"],
    getOrgPublicKey: ["GET /orgs/{org}/actions/secrets/public-key"],
    getOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}"],
    getOrgVariable: ["GET /orgs/{org}/actions/variables/{name}"],
    getPendingDeploymentsForRun: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"
    ],
    getRepoPermissions: [
      "GET /repos/{owner}/{repo}/actions/permissions",
      {},
      { renamed: ["actions", "getGithubActionsPermissionsRepository"] }
    ],
    getRepoPublicKey: ["GET /repos/{owner}/{repo}/actions/secrets/public-key"],
    getRepoSecret: ["GET /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
    getRepoVariable: ["GET /repos/{owner}/{repo}/actions/variables/{name}"],
    getReviewsForRun: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals"
    ],
    getSelfHostedRunnerForOrg: ["GET /orgs/{org}/actions/runners/{runner_id}"],
    getSelfHostedRunnerForRepo: [
      "GET /repos/{owner}/{repo}/actions/runners/{runner_id}"
    ],
    getWorkflow: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}"],
    getWorkflowAccessToRepository: [
      "GET /repos/{owner}/{repo}/actions/permissions/access"
    ],
    getWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}"],
    getWorkflowRunAttempt: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}"
    ],
    getWorkflowRunUsage: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing"
    ],
    getWorkflowUsage: [
      "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing"
    ],
    listArtifactsForRepo: ["GET /repos/{owner}/{repo}/actions/artifacts"],
    listEnvironmentSecrets: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets"
    ],
    listEnvironmentVariables: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/variables"
    ],
    listGithubHostedRunnersInGroupForOrg: [
      "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/hosted-runners"
    ],
    listHostedRunnersForOrg: ["GET /orgs/{org}/actions/hosted-runners"],
    listJobsForWorkflowRun: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs"
    ],
    listJobsForWorkflowRunAttempt: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs"
    ],
    listLabelsForSelfHostedRunnerForOrg: [
      "GET /orgs/{org}/actions/runners/{runner_id}/labels"
    ],
    listLabelsForSelfHostedRunnerForRepo: [
      "GET /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
    ],
    listOrgSecrets: ["GET /orgs/{org}/actions/secrets"],
    listOrgVariables: ["GET /orgs/{org}/actions/variables"],
    listRepoOrganizationSecrets: [
      "GET /repos/{owner}/{repo}/actions/organization-secrets"
    ],
    listRepoOrganizationVariables: [
      "GET /repos/{owner}/{repo}/actions/organization-variables"
    ],
    listRepoSecrets: ["GET /repos/{owner}/{repo}/actions/secrets"],
    listRepoVariables: ["GET /repos/{owner}/{repo}/actions/variables"],
    listRepoWorkflows: ["GET /repos/{owner}/{repo}/actions/workflows"],
    listRunnerApplicationsForOrg: ["GET /orgs/{org}/actions/runners/downloads"],
    listRunnerApplicationsForRepo: [
      "GET /repos/{owner}/{repo}/actions/runners/downloads"
    ],
    listSelectedReposForOrgSecret: [
      "GET /orgs/{org}/actions/secrets/{secret_name}/repositories"
    ],
    listSelectedReposForOrgVariable: [
      "GET /orgs/{org}/actions/variables/{name}/repositories"
    ],
    listSelectedRepositoriesEnabledGithubActionsOrganization: [
      "GET /orgs/{org}/actions/permissions/repositories"
    ],
    listSelfHostedRunnersForOrg: ["GET /orgs/{org}/actions/runners"],
    listSelfHostedRunnersForRepo: ["GET /repos/{owner}/{repo}/actions/runners"],
    listWorkflowRunArtifacts: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts"
    ],
    listWorkflowRuns: [
      "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs"
    ],
    listWorkflowRunsForRepo: ["GET /repos/{owner}/{repo}/actions/runs"],
    reRunJobForWorkflowRun: [
      "POST /repos/{owner}/{repo}/actions/jobs/{job_id}/rerun"
    ],
    reRunWorkflow: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun"],
    reRunWorkflowFailedJobs: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs"
    ],
    removeAllCustomLabelsFromSelfHostedRunnerForOrg: [
      "DELETE /orgs/{org}/actions/runners/{runner_id}/labels"
    ],
    removeAllCustomLabelsFromSelfHostedRunnerForRepo: [
      "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
    ],
    removeCustomLabelFromSelfHostedRunnerForOrg: [
      "DELETE /orgs/{org}/actions/runners/{runner_id}/labels/{name}"
    ],
    removeCustomLabelFromSelfHostedRunnerForRepo: [
      "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels/{name}"
    ],
    removeSelectedRepoFromOrgSecret: [
      "DELETE /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"
    ],
    removeSelectedRepoFromOrgVariable: [
      "DELETE /orgs/{org}/actions/variables/{name}/repositories/{repository_id}"
    ],
    reviewCustomGatesForRun: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/deployment_protection_rule"
    ],
    reviewPendingDeploymentsForRun: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"
    ],
    setAllowedActionsOrganization: [
      "PUT /orgs/{org}/actions/permissions/selected-actions"
    ],
    setAllowedActionsRepository: [
      "PUT /repos/{owner}/{repo}/actions/permissions/selected-actions"
    ],
    setCustomLabelsForSelfHostedRunnerForOrg: [
      "PUT /orgs/{org}/actions/runners/{runner_id}/labels"
    ],
    setCustomLabelsForSelfHostedRunnerForRepo: [
      "PUT /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
    ],
    setCustomOidcSubClaimForRepo: [
      "PUT /repos/{owner}/{repo}/actions/oidc/customization/sub"
    ],
    setGithubActionsDefaultWorkflowPermissionsOrganization: [
      "PUT /orgs/{org}/actions/permissions/workflow"
    ],
    setGithubActionsDefaultWorkflowPermissionsRepository: [
      "PUT /repos/{owner}/{repo}/actions/permissions/workflow"
    ],
    setGithubActionsPermissionsOrganization: [
      "PUT /orgs/{org}/actions/permissions"
    ],
    setGithubActionsPermissionsRepository: [
      "PUT /repos/{owner}/{repo}/actions/permissions"
    ],
    setSelectedReposForOrgSecret: [
      "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories"
    ],
    setSelectedReposForOrgVariable: [
      "PUT /orgs/{org}/actions/variables/{name}/repositories"
    ],
    setSelectedRepositoriesEnabledGithubActionsOrganization: [
      "PUT /orgs/{org}/actions/permissions/repositories"
    ],
    setWorkflowAccessToRepository: [
      "PUT /repos/{owner}/{repo}/actions/permissions/access"
    ],
    updateEnvironmentVariable: [
      "PATCH /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
    ],
    updateHostedRunnerForOrg: [
      "PATCH /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
    ],
    updateOrgVariable: ["PATCH /orgs/{org}/actions/variables/{name}"],
    updateRepoVariable: [
      "PATCH /repos/{owner}/{repo}/actions/variables/{name}"
    ]
  },
  activity: {
    checkRepoIsStarredByAuthenticatedUser: ["GET /user/starred/{owner}/{repo}"],
    deleteRepoSubscription: ["DELETE /repos/{owner}/{repo}/subscription"],
    deleteThreadSubscription: [
      "DELETE /notifications/threads/{thread_id}/subscription"
    ],
    getFeeds: ["GET /feeds"],
    getRepoSubscription: ["GET /repos/{owner}/{repo}/subscription"],
    getThread: ["GET /notifications/threads/{thread_id}"],
    getThreadSubscriptionForAuthenticatedUser: [
      "GET /notifications/threads/{thread_id}/subscription"
    ],
    listEventsForAuthenticatedUser: ["GET /users/{username}/events"],
    listNotificationsForAuthenticatedUser: ["GET /notifications"],
    listOrgEventsForAuthenticatedUser: [
      "GET /users/{username}/events/orgs/{org}"
    ],
    listPublicEvents: ["GET /events"],
    listPublicEventsForRepoNetwork: ["GET /networks/{owner}/{repo}/events"],
    listPublicEventsForUser: ["GET /users/{username}/events/public"],
    listPublicOrgEvents: ["GET /orgs/{org}/events"],
    listReceivedEventsForUser: ["GET /users/{username}/received_events"],
    listReceivedPublicEventsForUser: [
      "GET /users/{username}/received_events/public"
    ],
    listRepoEvents: ["GET /repos/{owner}/{repo}/events"],
    listRepoNotificationsForAuthenticatedUser: [
      "GET /repos/{owner}/{repo}/notifications"
    ],
    listReposStarredByAuthenticatedUser: ["GET /user/starred"],
    listReposStarredByUser: ["GET /users/{username}/starred"],
    listReposWatchedByUser: ["GET /users/{username}/subscriptions"],
    listStargazersForRepo: ["GET /repos/{owner}/{repo}/stargazers"],
    listWatchedReposForAuthenticatedUser: ["GET /user/subscriptions"],
    listWatchersForRepo: ["GET /repos/{owner}/{repo}/subscribers"],
    markNotificationsAsRead: ["PUT /notifications"],
    markRepoNotificationsAsRead: ["PUT /repos/{owner}/{repo}/notifications"],
    markThreadAsDone: ["DELETE /notifications/threads/{thread_id}"],
    markThreadAsRead: ["PATCH /notifications/threads/{thread_id}"],
    setRepoSubscription: ["PUT /repos/{owner}/{repo}/subscription"],
    setThreadSubscription: [
      "PUT /notifications/threads/{thread_id}/subscription"
    ],
    starRepoForAuthenticatedUser: ["PUT /user/starred/{owner}/{repo}"],
    unstarRepoForAuthenticatedUser: ["DELETE /user/starred/{owner}/{repo}"]
  },
  apps: {
    addRepoToInstallation: [
      "PUT /user/installations/{installation_id}/repositories/{repository_id}",
      {},
      { renamed: ["apps", "addRepoToInstallationForAuthenticatedUser"] }
    ],
    addRepoToInstallationForAuthenticatedUser: [
      "PUT /user/installations/{installation_id}/repositories/{repository_id}"
    ],
    checkToken: ["POST /applications/{client_id}/token"],
    createFromManifest: ["POST /app-manifests/{code}/conversions"],
    createInstallationAccessToken: [
      "POST /app/installations/{installation_id}/access_tokens"
    ],
    deleteAuthorization: ["DELETE /applications/{client_id}/grant"],
    deleteInstallation: ["DELETE /app/installations/{installation_id}"],
    deleteToken: ["DELETE /applications/{client_id}/token"],
    getAuthenticated: ["GET /app"],
    getBySlug: ["GET /apps/{app_slug}"],
    getInstallation: ["GET /app/installations/{installation_id}"],
    getOrgInstallation: ["GET /orgs/{org}/installation"],
    getRepoInstallation: ["GET /repos/{owner}/{repo}/installation"],
    getSubscriptionPlanForAccount: [
      "GET /marketplace_listing/accounts/{account_id}"
    ],
    getSubscriptionPlanForAccountStubbed: [
      "GET /marketplace_listing/stubbed/accounts/{account_id}"
    ],
    getUserInstallation: ["GET /users/{username}/installation"],
    getWebhookConfigForApp: ["GET /app/hook/config"],
    getWebhookDelivery: ["GET /app/hook/deliveries/{delivery_id}"],
    listAccountsForPlan: ["GET /marketplace_listing/plans/{plan_id}/accounts"],
    listAccountsForPlanStubbed: [
      "GET /marketplace_listing/stubbed/plans/{plan_id}/accounts"
    ],
    listInstallationReposForAuthenticatedUser: [
      "GET /user/installations/{installation_id}/repositories"
    ],
    listInstallationRequestsForAuthenticatedApp: [
      "GET /app/installation-requests"
    ],
    listInstallations: ["GET /app/installations"],
    listInstallationsForAuthenticatedUser: ["GET /user/installations"],
    listPlans: ["GET /marketplace_listing/plans"],
    listPlansStubbed: ["GET /marketplace_listing/stubbed/plans"],
    listReposAccessibleToInstallation: ["GET /installation/repositories"],
    listSubscriptionsForAuthenticatedUser: ["GET /user/marketplace_purchases"],
    listSubscriptionsForAuthenticatedUserStubbed: [
      "GET /user/marketplace_purchases/stubbed"
    ],
    listWebhookDeliveries: ["GET /app/hook/deliveries"],
    redeliverWebhookDelivery: [
      "POST /app/hook/deliveries/{delivery_id}/attempts"
    ],
    removeRepoFromInstallation: [
      "DELETE /user/installations/{installation_id}/repositories/{repository_id}",
      {},
      { renamed: ["apps", "removeRepoFromInstallationForAuthenticatedUser"] }
    ],
    removeRepoFromInstallationForAuthenticatedUser: [
      "DELETE /user/installations/{installation_id}/repositories/{repository_id}"
    ],
    resetToken: ["PATCH /applications/{client_id}/token"],
    revokeInstallationAccessToken: ["DELETE /installation/token"],
    scopeToken: ["POST /applications/{client_id}/token/scoped"],
    suspendInstallation: ["PUT /app/installations/{installation_id}/suspended"],
    unsuspendInstallation: [
      "DELETE /app/installations/{installation_id}/suspended"
    ],
    updateWebhookConfigForApp: ["PATCH /app/hook/config"]
  },
  billing: {
    getGithubActionsBillingOrg: ["GET /orgs/{org}/settings/billing/actions"],
    getGithubActionsBillingUser: [
      "GET /users/{username}/settings/billing/actions"
    ],
    getGithubBillingUsageReportOrg: [
      "GET /organizations/{org}/settings/billing/usage"
    ],
    getGithubPackagesBillingOrg: ["GET /orgs/{org}/settings/billing/packages"],
    getGithubPackagesBillingUser: [
      "GET /users/{username}/settings/billing/packages"
    ],
    getSharedStorageBillingOrg: [
      "GET /orgs/{org}/settings/billing/shared-storage"
    ],
    getSharedStorageBillingUser: [
      "GET /users/{username}/settings/billing/shared-storage"
    ]
  },
  campaigns: {
    createCampaign: ["POST /orgs/{org}/campaigns"],
    deleteCampaign: ["DELETE /orgs/{org}/campaigns/{campaign_number}"],
    getCampaignSummary: ["GET /orgs/{org}/campaigns/{campaign_number}"],
    listOrgCampaigns: ["GET /orgs/{org}/campaigns"],
    updateCampaign: ["PATCH /orgs/{org}/campaigns/{campaign_number}"]
  },
  checks: {
    create: ["POST /repos/{owner}/{repo}/check-runs"],
    createSuite: ["POST /repos/{owner}/{repo}/check-suites"],
    get: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}"],
    getSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}"],
    listAnnotations: [
      "GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations"
    ],
    listForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-runs"],
    listForSuite: [
      "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs"
    ],
    listSuitesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-suites"],
    rerequestRun: [
      "POST /repos/{owner}/{repo}/check-runs/{check_run_id}/rerequest"
    ],
    rerequestSuite: [
      "POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest"
    ],
    setSuitesPreferences: [
      "PATCH /repos/{owner}/{repo}/check-suites/preferences"
    ],
    update: ["PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}"]
  },
  codeScanning: {
    commitAutofix: [
      "POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix/commits"
    ],
    createAutofix: [
      "POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix"
    ],
    createVariantAnalysis: [
      "POST /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses"
    ],
    deleteAnalysis: [
      "DELETE /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}{?confirm_delete}"
    ],
    deleteCodeqlDatabase: [
      "DELETE /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}"
    ],
    getAlert: [
      "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
      {},
      { renamedParameters: { alert_id: "alert_number" } }
    ],
    getAnalysis: [
      "GET /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}"
    ],
    getAutofix: [
      "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix"
    ],
    getCodeqlDatabase: [
      "GET /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}"
    ],
    getDefaultSetup: ["GET /repos/{owner}/{repo}/code-scanning/default-setup"],
    getSarif: ["GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}"],
    getVariantAnalysis: [
      "GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}"
    ],
    getVariantAnalysisRepoTask: [
      "GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}/repos/{repo_owner}/{repo_name}"
    ],
    listAlertInstances: [
      "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances"
    ],
    listAlertsForOrg: ["GET /orgs/{org}/code-scanning/alerts"],
    listAlertsForRepo: ["GET /repos/{owner}/{repo}/code-scanning/alerts"],
    listAlertsInstances: [
      "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances",
      {},
      { renamed: ["codeScanning", "listAlertInstances"] }
    ],
    listCodeqlDatabases: [
      "GET /repos/{owner}/{repo}/code-scanning/codeql/databases"
    ],
    listRecentAnalyses: ["GET /repos/{owner}/{repo}/code-scanning/analyses"],
    updateAlert: [
      "PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}"
    ],
    updateDefaultSetup: [
      "PATCH /repos/{owner}/{repo}/code-scanning/default-setup"
    ],
    uploadSarif: ["POST /repos/{owner}/{repo}/code-scanning/sarifs"]
  },
  codeSecurity: {
    attachConfiguration: [
      "POST /orgs/{org}/code-security/configurations/{configuration_id}/attach"
    ],
    attachEnterpriseConfiguration: [
      "POST /enterprises/{enterprise}/code-security/configurations/{configuration_id}/attach"
    ],
    createConfiguration: ["POST /orgs/{org}/code-security/configurations"],
    createConfigurationForEnterprise: [
      "POST /enterprises/{enterprise}/code-security/configurations"
    ],
    deleteConfiguration: [
      "DELETE /orgs/{org}/code-security/configurations/{configuration_id}"
    ],
    deleteConfigurationForEnterprise: [
      "DELETE /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
    ],
    detachConfiguration: [
      "DELETE /orgs/{org}/code-security/configurations/detach"
    ],
    getConfiguration: [
      "GET /orgs/{org}/code-security/configurations/{configuration_id}"
    ],
    getConfigurationForRepository: [
      "GET /repos/{owner}/{repo}/code-security-configuration"
    ],
    getConfigurationsForEnterprise: [
      "GET /enterprises/{enterprise}/code-security/configurations"
    ],
    getConfigurationsForOrg: ["GET /orgs/{org}/code-security/configurations"],
    getDefaultConfigurations: [
      "GET /orgs/{org}/code-security/configurations/defaults"
    ],
    getDefaultConfigurationsForEnterprise: [
      "GET /enterprises/{enterprise}/code-security/configurations/defaults"
    ],
    getRepositoriesForConfiguration: [
      "GET /orgs/{org}/code-security/configurations/{configuration_id}/repositories"
    ],
    getRepositoriesForEnterpriseConfiguration: [
      "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}/repositories"
    ],
    getSingleConfigurationForEnterprise: [
      "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
    ],
    setConfigurationAsDefault: [
      "PUT /orgs/{org}/code-security/configurations/{configuration_id}/defaults"
    ],
    setConfigurationAsDefaultForEnterprise: [
      "PUT /enterprises/{enterprise}/code-security/configurations/{configuration_id}/defaults"
    ],
    updateConfiguration: [
      "PATCH /orgs/{org}/code-security/configurations/{configuration_id}"
    ],
    updateEnterpriseConfiguration: [
      "PATCH /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
    ]
  },
  codesOfConduct: {
    getAllCodesOfConduct: ["GET /codes_of_conduct"],
    getConductCode: ["GET /codes_of_conduct/{key}"]
  },
  codespaces: {
    addRepositoryForSecretForAuthenticatedUser: [
      "PUT /user/codespaces/secrets/{secret_name}/repositories/{repository_id}"
    ],
    addSelectedRepoToOrgSecret: [
      "PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}"
    ],
    checkPermissionsForDevcontainer: [
      "GET /repos/{owner}/{repo}/codespaces/permissions_check"
    ],
    codespaceMachinesForAuthenticatedUser: [
      "GET /user/codespaces/{codespace_name}/machines"
    ],
    createForAuthenticatedUser: ["POST /user/codespaces"],
    createOrUpdateOrgSecret: [
      "PUT /orgs/{org}/codespaces/secrets/{secret_name}"
    ],
    createOrUpdateRepoSecret: [
      "PUT /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
    ],
    createOrUpdateSecretForAuthenticatedUser: [
      "PUT /user/codespaces/secrets/{secret_name}"
    ],
    createWithPrForAuthenticatedUser: [
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/codespaces"
    ],
    createWithRepoForAuthenticatedUser: [
      "POST /repos/{owner}/{repo}/codespaces"
    ],
    deleteForAuthenticatedUser: ["DELETE /user/codespaces/{codespace_name}"],
    deleteFromOrganization: [
      "DELETE /orgs/{org}/members/{username}/codespaces/{codespace_name}"
    ],
    deleteOrgSecret: ["DELETE /orgs/{org}/codespaces/secrets/{secret_name}"],
    deleteRepoSecret: [
      "DELETE /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
    ],
    deleteSecretForAuthenticatedUser: [
      "DELETE /user/codespaces/secrets/{secret_name}"
    ],
    exportForAuthenticatedUser: [
      "POST /user/codespaces/{codespace_name}/exports"
    ],
    getCodespacesForUserInOrg: [
      "GET /orgs/{org}/members/{username}/codespaces"
    ],
    getExportDetailsForAuthenticatedUser: [
      "GET /user/codespaces/{codespace_name}/exports/{export_id}"
    ],
    getForAuthenticatedUser: ["GET /user/codespaces/{codespace_name}"],
    getOrgPublicKey: ["GET /orgs/{org}/codespaces/secrets/public-key"],
    getOrgSecret: ["GET /orgs/{org}/codespaces/secrets/{secret_name}"],
    getPublicKeyForAuthenticatedUser: [
      "GET /user/codespaces/secrets/public-key"
    ],
    getRepoPublicKey: [
      "GET /repos/{owner}/{repo}/codespaces/secrets/public-key"
    ],
    getRepoSecret: [
      "GET /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
    ],
    getSecretForAuthenticatedUser: [
      "GET /user/codespaces/secrets/{secret_name}"
    ],
    listDevcontainersInRepositoryForAuthenticatedUser: [
      "GET /repos/{owner}/{repo}/codespaces/devcontainers"
    ],
    listForAuthenticatedUser: ["GET /user/codespaces"],
    listInOrganization: [
      "GET /orgs/{org}/codespaces",
      {},
      { renamedParameters: { org_id: "org" } }
    ],
    listInRepositoryForAuthenticatedUser: [
      "GET /repos/{owner}/{repo}/codespaces"
    ],
    listOrgSecrets: ["GET /orgs/{org}/codespaces/secrets"],
    listRepoSecrets: ["GET /repos/{owner}/{repo}/codespaces/secrets"],
    listRepositoriesForSecretForAuthenticatedUser: [
      "GET /user/codespaces/secrets/{secret_name}/repositories"
    ],
    listSecretsForAuthenticatedUser: ["GET /user/codespaces/secrets"],
    listSelectedReposForOrgSecret: [
      "GET /orgs/{org}/codespaces/secrets/{secret_name}/repositories"
    ],
    preFlightWithRepoForAuthenticatedUser: [
      "GET /repos/{owner}/{repo}/codespaces/new"
    ],
    publishForAuthenticatedUser: [
      "POST /user/codespaces/{codespace_name}/publish"
    ],
    removeRepositoryForSecretForAuthenticatedUser: [
      "DELETE /user/codespaces/secrets/{secret_name}/repositories/{repository_id}"
    ],
    removeSelectedRepoFromOrgSecret: [
      "DELETE /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}"
    ],
    repoMachinesForAuthenticatedUser: [
      "GET /repos/{owner}/{repo}/codespaces/machines"
    ],
    setRepositoriesForSecretForAuthenticatedUser: [
      "PUT /user/codespaces/secrets/{secret_name}/repositories"
    ],
    setSelectedReposForOrgSecret: [
      "PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories"
    ],
    startForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/start"],
    stopForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/stop"],
    stopInOrganization: [
      "POST /orgs/{org}/members/{username}/codespaces/{codespace_name}/stop"
    ],
    updateForAuthenticatedUser: ["PATCH /user/codespaces/{codespace_name}"]
  },
  copilot: {
    addCopilotSeatsForTeams: [
      "POST /orgs/{org}/copilot/billing/selected_teams"
    ],
    addCopilotSeatsForUsers: [
      "POST /orgs/{org}/copilot/billing/selected_users"
    ],
    cancelCopilotSeatAssignmentForTeams: [
      "DELETE /orgs/{org}/copilot/billing/selected_teams"
    ],
    cancelCopilotSeatAssignmentForUsers: [
      "DELETE /orgs/{org}/copilot/billing/selected_users"
    ],
    copilotMetricsForOrganization: ["GET /orgs/{org}/copilot/metrics"],
    copilotMetricsForTeam: ["GET /orgs/{org}/team/{team_slug}/copilot/metrics"],
    getCopilotOrganizationDetails: ["GET /orgs/{org}/copilot/billing"],
    getCopilotSeatDetailsForUser: [
      "GET /orgs/{org}/members/{username}/copilot"
    ],
    listCopilotSeats: ["GET /orgs/{org}/copilot/billing/seats"]
  },
  dependabot: {
    addSelectedRepoToOrgSecret: [
      "PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}"
    ],
    createOrUpdateOrgSecret: [
      "PUT /orgs/{org}/dependabot/secrets/{secret_name}"
    ],
    createOrUpdateRepoSecret: [
      "PUT /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
    ],
    deleteOrgSecret: ["DELETE /orgs/{org}/dependabot/secrets/{secret_name}"],
    deleteRepoSecret: [
      "DELETE /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
    ],
    getAlert: ["GET /repos/{owner}/{repo}/dependabot/alerts/{alert_number}"],
    getOrgPublicKey: ["GET /orgs/{org}/dependabot/secrets/public-key"],
    getOrgSecret: ["GET /orgs/{org}/dependabot/secrets/{secret_name}"],
    getRepoPublicKey: [
      "GET /repos/{owner}/{repo}/dependabot/secrets/public-key"
    ],
    getRepoSecret: [
      "GET /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
    ],
    listAlertsForEnterprise: [
      "GET /enterprises/{enterprise}/dependabot/alerts"
    ],
    listAlertsForOrg: ["GET /orgs/{org}/dependabot/alerts"],
    listAlertsForRepo: ["GET /repos/{owner}/{repo}/dependabot/alerts"],
    listOrgSecrets: ["GET /orgs/{org}/dependabot/secrets"],
    listRepoSecrets: ["GET /repos/{owner}/{repo}/dependabot/secrets"],
    listSelectedReposForOrgSecret: [
      "GET /orgs/{org}/dependabot/secrets/{secret_name}/repositories"
    ],
    removeSelectedRepoFromOrgSecret: [
      "DELETE /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}"
    ],
    setSelectedReposForOrgSecret: [
      "PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories"
    ],
    updateAlert: [
      "PATCH /repos/{owner}/{repo}/dependabot/alerts/{alert_number}"
    ]
  },
  dependencyGraph: {
    createRepositorySnapshot: [
      "POST /repos/{owner}/{repo}/dependency-graph/snapshots"
    ],
    diffRange: [
      "GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}"
    ],
    exportSbom: ["GET /repos/{owner}/{repo}/dependency-graph/sbom"]
  },
  emojis: { get: ["GET /emojis"] },
  gists: {
    checkIsStarred: ["GET /gists/{gist_id}/star"],
    create: ["POST /gists"],
    createComment: ["POST /gists/{gist_id}/comments"],
    delete: ["DELETE /gists/{gist_id}"],
    deleteComment: ["DELETE /gists/{gist_id}/comments/{comment_id}"],
    fork: ["POST /gists/{gist_id}/forks"],
    get: ["GET /gists/{gist_id}"],
    getComment: ["GET /gists/{gist_id}/comments/{comment_id}"],
    getRevision: ["GET /gists/{gist_id}/{sha}"],
    list: ["GET /gists"],
    listComments: ["GET /gists/{gist_id}/comments"],
    listCommits: ["GET /gists/{gist_id}/commits"],
    listForUser: ["GET /users/{username}/gists"],
    listForks: ["GET /gists/{gist_id}/forks"],
    listPublic: ["GET /gists/public"],
    listStarred: ["GET /gists/starred"],
    star: ["PUT /gists/{gist_id}/star"],
    unstar: ["DELETE /gists/{gist_id}/star"],
    update: ["PATCH /gists/{gist_id}"],
    updateComment: ["PATCH /gists/{gist_id}/comments/{comment_id}"]
  },
  git: {
    createBlob: ["POST /repos/{owner}/{repo}/git/blobs"],
    createCommit: ["POST /repos/{owner}/{repo}/git/commits"],
    createRef: ["POST /repos/{owner}/{repo}/git/refs"],
    createTag: ["POST /repos/{owner}/{repo}/git/tags"],
    createTree: ["POST /repos/{owner}/{repo}/git/trees"],
    deleteRef: ["DELETE /repos/{owner}/{repo}/git/refs/{ref}"],
    getBlob: ["GET /repos/{owner}/{repo}/git/blobs/{file_sha}"],
    getCommit: ["GET /repos/{owner}/{repo}/git/commits/{commit_sha}"],
    getRef: ["GET /repos/{owner}/{repo}/git/ref/{ref}"],
    getTag: ["GET /repos/{owner}/{repo}/git/tags/{tag_sha}"],
    getTree: ["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"],
    listMatchingRefs: ["GET /repos/{owner}/{repo}/git/matching-refs/{ref}"],
    updateRef: ["PATCH /repos/{owner}/{repo}/git/refs/{ref}"]
  },
  gitignore: {
    getAllTemplates: ["GET /gitignore/templates"],
    getTemplate: ["GET /gitignore/templates/{name}"]
  },
  hostedCompute: {
    createNetworkConfigurationForOrg: [
      "POST /orgs/{org}/settings/network-configurations"
    ],
    deleteNetworkConfigurationFromOrg: [
      "DELETE /orgs/{org}/settings/network-configurations/{network_configuration_id}"
    ],
    getNetworkConfigurationForOrg: [
      "GET /orgs/{org}/settings/network-configurations/{network_configuration_id}"
    ],
    getNetworkSettingsForOrg: [
      "GET /orgs/{org}/settings/network-settings/{network_settings_id}"
    ],
    listNetworkConfigurationsForOrg: [
      "GET /orgs/{org}/settings/network-configurations"
    ],
    updateNetworkConfigurationForOrg: [
      "PATCH /orgs/{org}/settings/network-configurations/{network_configuration_id}"
    ]
  },
  interactions: {
    getRestrictionsForAuthenticatedUser: ["GET /user/interaction-limits"],
    getRestrictionsForOrg: ["GET /orgs/{org}/interaction-limits"],
    getRestrictionsForRepo: ["GET /repos/{owner}/{repo}/interaction-limits"],
    getRestrictionsForYourPublicRepos: [
      "GET /user/interaction-limits",
      {},
      { renamed: ["interactions", "getRestrictionsForAuthenticatedUser"] }
    ],
    removeRestrictionsForAuthenticatedUser: ["DELETE /user/interaction-limits"],
    removeRestrictionsForOrg: ["DELETE /orgs/{org}/interaction-limits"],
    removeRestrictionsForRepo: [
      "DELETE /repos/{owner}/{repo}/interaction-limits"
    ],
    removeRestrictionsForYourPublicRepos: [
      "DELETE /user/interaction-limits",
      {},
      { renamed: ["interactions", "removeRestrictionsForAuthenticatedUser"] }
    ],
    setRestrictionsForAuthenticatedUser: ["PUT /user/interaction-limits"],
    setRestrictionsForOrg: ["PUT /orgs/{org}/interaction-limits"],
    setRestrictionsForRepo: ["PUT /repos/{owner}/{repo}/interaction-limits"],
    setRestrictionsForYourPublicRepos: [
      "PUT /user/interaction-limits",
      {},
      { renamed: ["interactions", "setRestrictionsForAuthenticatedUser"] }
    ]
  },
  issues: {
    addAssignees: [
      "POST /repos/{owner}/{repo}/issues/{issue_number}/assignees"
    ],
    addLabels: ["POST /repos/{owner}/{repo}/issues/{issue_number}/labels"],
    addSubIssue: [
      "POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues"
    ],
    checkUserCanBeAssigned: ["GET /repos/{owner}/{repo}/assignees/{assignee}"],
    checkUserCanBeAssignedToIssue: [
      "GET /repos/{owner}/{repo}/issues/{issue_number}/assignees/{assignee}"
    ],
    create: ["POST /repos/{owner}/{repo}/issues"],
    createComment: [
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments"
    ],
    createLabel: ["POST /repos/{owner}/{repo}/labels"],
    createMilestone: ["POST /repos/{owner}/{repo}/milestones"],
    deleteComment: [
      "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}"
    ],
    deleteLabel: ["DELETE /repos/{owner}/{repo}/labels/{name}"],
    deleteMilestone: [
      "DELETE /repos/{owner}/{repo}/milestones/{milestone_number}"
    ],
    get: ["GET /repos/{owner}/{repo}/issues/{issue_number}"],
    getComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}"],
    getEvent: ["GET /repos/{owner}/{repo}/issues/events/{event_id}"],
    getLabel: ["GET /repos/{owner}/{repo}/labels/{name}"],
    getMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}"],
    list: ["GET /issues"],
    listAssignees: ["GET /repos/{owner}/{repo}/assignees"],
    listComments: ["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"],
    listCommentsForRepo: ["GET /repos/{owner}/{repo}/issues/comments"],
    listEvents: ["GET /repos/{owner}/{repo}/issues/{issue_number}/events"],
    listEventsForRepo: ["GET /repos/{owner}/{repo}/issues/events"],
    listEventsForTimeline: [
      "GET /repos/{owner}/{repo}/issues/{issue_number}/timeline"
    ],
    listForAuthenticatedUser: ["GET /user/issues"],
    listForOrg: ["GET /orgs/{org}/issues"],
    listForRepo: ["GET /repos/{owner}/{repo}/issues"],
    listLabelsForMilestone: [
      "GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels"
    ],
    listLabelsForRepo: ["GET /repos/{owner}/{repo}/labels"],
    listLabelsOnIssue: [
      "GET /repos/{owner}/{repo}/issues/{issue_number}/labels"
    ],
    listMilestones: ["GET /repos/{owner}/{repo}/milestones"],
    listSubIssues: [
      "GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues"
    ],
    lock: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/lock"],
    removeAllLabels: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels"
    ],
    removeAssignees: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees"
    ],
    removeLabel: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}"
    ],
    removeSubIssue: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue"
    ],
    reprioritizeSubIssue: [
      "PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority"
    ],
    setLabels: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/labels"],
    unlock: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/lock"],
    update: ["PATCH /repos/{owner}/{repo}/issues/{issue_number}"],
    updateComment: ["PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}"],
    updateLabel: ["PATCH /repos/{owner}/{repo}/labels/{name}"],
    updateMilestone: [
      "PATCH /repos/{owner}/{repo}/milestones/{milestone_number}"
    ]
  },
  licenses: {
    get: ["GET /licenses/{license}"],
    getAllCommonlyUsed: ["GET /licenses"],
    getForRepo: ["GET /repos/{owner}/{repo}/license"]
  },
  markdown: {
    render: ["POST /markdown"],
    renderRaw: [
      "POST /markdown/raw",
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    ]
  },
  meta: {
    get: ["GET /meta"],
    getAllVersions: ["GET /versions"],
    getOctocat: ["GET /octocat"],
    getZen: ["GET /zen"],
    root: ["GET /"]
  },
  migrations: {
    deleteArchiveForAuthenticatedUser: [
      "DELETE /user/migrations/{migration_id}/archive"
    ],
    deleteArchiveForOrg: [
      "DELETE /orgs/{org}/migrations/{migration_id}/archive"
    ],
    downloadArchiveForOrg: [
      "GET /orgs/{org}/migrations/{migration_id}/archive"
    ],
    getArchiveForAuthenticatedUser: [
      "GET /user/migrations/{migration_id}/archive"
    ],
    getStatusForAuthenticatedUser: ["GET /user/migrations/{migration_id}"],
    getStatusForOrg: ["GET /orgs/{org}/migrations/{migration_id}"],
    listForAuthenticatedUser: ["GET /user/migrations"],
    listForOrg: ["GET /orgs/{org}/migrations"],
    listReposForAuthenticatedUser: [
      "GET /user/migrations/{migration_id}/repositories"
    ],
    listReposForOrg: ["GET /orgs/{org}/migrations/{migration_id}/repositories"],
    listReposForUser: [
      "GET /user/migrations/{migration_id}/repositories",
      {},
      { renamed: ["migrations", "listReposForAuthenticatedUser"] }
    ],
    startForAuthenticatedUser: ["POST /user/migrations"],
    startForOrg: ["POST /orgs/{org}/migrations"],
    unlockRepoForAuthenticatedUser: [
      "DELETE /user/migrations/{migration_id}/repos/{repo_name}/lock"
    ],
    unlockRepoForOrg: [
      "DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock"
    ]
  },
  oidc: {
    getOidcCustomSubTemplateForOrg: [
      "GET /orgs/{org}/actions/oidc/customization/sub"
    ],
    updateOidcCustomSubTemplateForOrg: [
      "PUT /orgs/{org}/actions/oidc/customization/sub"
    ]
  },
  orgs: {
    addSecurityManagerTeam: [
      "PUT /orgs/{org}/security-managers/teams/{team_slug}",
      {},
      {
        deprecated: "octokit.rest.orgs.addSecurityManagerTeam() is deprecated, see https://docs.github.com/rest/orgs/security-managers#add-a-security-manager-team"
      }
    ],
    assignTeamToOrgRole: [
      "PUT /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}"
    ],
    assignUserToOrgRole: [
      "PUT /orgs/{org}/organization-roles/users/{username}/{role_id}"
    ],
    blockUser: ["PUT /orgs/{org}/blocks/{username}"],
    cancelInvitation: ["DELETE /orgs/{org}/invitations/{invitation_id}"],
    checkBlockedUser: ["GET /orgs/{org}/blocks/{username}"],
    checkMembershipForUser: ["GET /orgs/{org}/members/{username}"],
    checkPublicMembershipForUser: ["GET /orgs/{org}/public_members/{username}"],
    convertMemberToOutsideCollaborator: [
      "PUT /orgs/{org}/outside_collaborators/{username}"
    ],
    createInvitation: ["POST /orgs/{org}/invitations"],
    createIssueType: ["POST /orgs/{org}/issue-types"],
    createOrUpdateCustomProperties: ["PATCH /orgs/{org}/properties/schema"],
    createOrUpdateCustomPropertiesValuesForRepos: [
      "PATCH /orgs/{org}/properties/values"
    ],
    createOrUpdateCustomProperty: [
      "PUT /orgs/{org}/properties/schema/{custom_property_name}"
    ],
    createWebhook: ["POST /orgs/{org}/hooks"],
    delete: ["DELETE /orgs/{org}"],
    deleteIssueType: ["DELETE /orgs/{org}/issue-types/{issue_type_id}"],
    deleteWebhook: ["DELETE /orgs/{org}/hooks/{hook_id}"],
    enableOrDisableSecurityProductOnAllOrgRepos: [
      "POST /orgs/{org}/{security_product}/{enablement}",
      {},
      {
        deprecated: "octokit.rest.orgs.enableOrDisableSecurityProductOnAllOrgRepos() is deprecated, see https://docs.github.com/rest/orgs/orgs#enable-or-disable-a-security-feature-for-an-organization"
      }
    ],
    get: ["GET /orgs/{org}"],
    getAllCustomProperties: ["GET /orgs/{org}/properties/schema"],
    getCustomProperty: [
      "GET /orgs/{org}/properties/schema/{custom_property_name}"
    ],
    getMembershipForAuthenticatedUser: ["GET /user/memberships/orgs/{org}"],
    getMembershipForUser: ["GET /orgs/{org}/memberships/{username}"],
    getOrgRole: ["GET /orgs/{org}/organization-roles/{role_id}"],
    getOrgRulesetHistory: ["GET /orgs/{org}/rulesets/{ruleset_id}/history"],
    getOrgRulesetVersion: [
      "GET /orgs/{org}/rulesets/{ruleset_id}/history/{version_id}"
    ],
    getWebhook: ["GET /orgs/{org}/hooks/{hook_id}"],
    getWebhookConfigForOrg: ["GET /orgs/{org}/hooks/{hook_id}/config"],
    getWebhookDelivery: [
      "GET /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}"
    ],
    list: ["GET /organizations"],
    listAppInstallations: ["GET /orgs/{org}/installations"],
    listAttestations: ["GET /orgs/{org}/attestations/{subject_digest}"],
    listBlockedUsers: ["GET /orgs/{org}/blocks"],
    listCustomPropertiesValuesForRepos: ["GET /orgs/{org}/properties/values"],
    listFailedInvitations: ["GET /orgs/{org}/failed_invitations"],
    listForAuthenticatedUser: ["GET /user/orgs"],
    listForUser: ["GET /users/{username}/orgs"],
    listInvitationTeams: ["GET /orgs/{org}/invitations/{invitation_id}/teams"],
    listIssueTypes: ["GET /orgs/{org}/issue-types"],
    listMembers: ["GET /orgs/{org}/members"],
    listMembershipsForAuthenticatedUser: ["GET /user/memberships/orgs"],
    listOrgRoleTeams: ["GET /orgs/{org}/organization-roles/{role_id}/teams"],
    listOrgRoleUsers: ["GET /orgs/{org}/organization-roles/{role_id}/users"],
    listOrgRoles: ["GET /orgs/{org}/organization-roles"],
    listOrganizationFineGrainedPermissions: [
      "GET /orgs/{org}/organization-fine-grained-permissions"
    ],
    listOutsideCollaborators: ["GET /orgs/{org}/outside_collaborators"],
    listPatGrantRepositories: [
      "GET /orgs/{org}/personal-access-tokens/{pat_id}/repositories"
    ],
    listPatGrantRequestRepositories: [
      "GET /orgs/{org}/personal-access-token-requests/{pat_request_id}/repositories"
    ],
    listPatGrantRequests: ["GET /orgs/{org}/personal-access-token-requests"],
    listPatGrants: ["GET /orgs/{org}/personal-access-tokens"],
    listPendingInvitations: ["GET /orgs/{org}/invitations"],
    listPublicMembers: ["GET /orgs/{org}/public_members"],
    listSecurityManagerTeams: [
      "GET /orgs/{org}/security-managers",
      {},
      {
        deprecated: "octokit.rest.orgs.listSecurityManagerTeams() is deprecated, see https://docs.github.com/rest/orgs/security-managers#list-security-manager-teams"
      }
    ],
    listWebhookDeliveries: ["GET /orgs/{org}/hooks/{hook_id}/deliveries"],
    listWebhooks: ["GET /orgs/{org}/hooks"],
    pingWebhook: ["POST /orgs/{org}/hooks/{hook_id}/pings"],
    redeliverWebhookDelivery: [
      "POST /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"
    ],
    removeCustomProperty: [
      "DELETE /orgs/{org}/properties/schema/{custom_property_name}"
    ],
    removeMember: ["DELETE /orgs/{org}/members/{username}"],
    removeMembershipForUser: ["DELETE /orgs/{org}/memberships/{username}"],
    removeOutsideCollaborator: [
      "DELETE /orgs/{org}/outside_collaborators/{username}"
    ],
    removePublicMembershipForAuthenticatedUser: [
      "DELETE /orgs/{org}/public_members/{username}"
    ],
    removeSecurityManagerTeam: [
      "DELETE /orgs/{org}/security-managers/teams/{team_slug}",
      {},
      {
        deprecated: "octokit.rest.orgs.removeSecurityManagerTeam() is deprecated, see https://docs.github.com/rest/orgs/security-managers#remove-a-security-manager-team"
      }
    ],
    reviewPatGrantRequest: [
      "POST /orgs/{org}/personal-access-token-requests/{pat_request_id}"
    ],
    reviewPatGrantRequestsInBulk: [
      "POST /orgs/{org}/personal-access-token-requests"
    ],
    revokeAllOrgRolesTeam: [
      "DELETE /orgs/{org}/organization-roles/teams/{team_slug}"
    ],
    revokeAllOrgRolesUser: [
      "DELETE /orgs/{org}/organization-roles/users/{username}"
    ],
    revokeOrgRoleTeam: [
      "DELETE /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}"
    ],
    revokeOrgRoleUser: [
      "DELETE /orgs/{org}/organization-roles/users/{username}/{role_id}"
    ],
    setMembershipForUser: ["PUT /orgs/{org}/memberships/{username}"],
    setPublicMembershipForAuthenticatedUser: [
      "PUT /orgs/{org}/public_members/{username}"
    ],
    unblockUser: ["DELETE /orgs/{org}/blocks/{username}"],
    update: ["PATCH /orgs/{org}"],
    updateIssueType: ["PUT /orgs/{org}/issue-types/{issue_type_id}"],
    updateMembershipForAuthenticatedUser: [
      "PATCH /user/memberships/orgs/{org}"
    ],
    updatePatAccess: ["POST /orgs/{org}/personal-access-tokens/{pat_id}"],
    updatePatAccesses: ["POST /orgs/{org}/personal-access-tokens"],
    updateWebhook: ["PATCH /orgs/{org}/hooks/{hook_id}"],
    updateWebhookConfigForOrg: ["PATCH /orgs/{org}/hooks/{hook_id}/config"]
  },
  packages: {
    deletePackageForAuthenticatedUser: [
      "DELETE /user/packages/{package_type}/{package_name}"
    ],
    deletePackageForOrg: [
      "DELETE /orgs/{org}/packages/{package_type}/{package_name}"
    ],
    deletePackageForUser: [
      "DELETE /users/{username}/packages/{package_type}/{package_name}"
    ],
    deletePackageVersionForAuthenticatedUser: [
      "DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    deletePackageVersionForOrg: [
      "DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    deletePackageVersionForUser: [
      "DELETE /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    getAllPackageVersionsForAPackageOwnedByAnOrg: [
      "GET /orgs/{org}/packages/{package_type}/{package_name}/versions",
      {},
      { renamed: ["packages", "getAllPackageVersionsForPackageOwnedByOrg"] }
    ],
    getAllPackageVersionsForAPackageOwnedByTheAuthenticatedUser: [
      "GET /user/packages/{package_type}/{package_name}/versions",
      {},
      {
        renamed: [
          "packages",
          "getAllPackageVersionsForPackageOwnedByAuthenticatedUser"
        ]
      }
    ],
    getAllPackageVersionsForPackageOwnedByAuthenticatedUser: [
      "GET /user/packages/{package_type}/{package_name}/versions"
    ],
    getAllPackageVersionsForPackageOwnedByOrg: [
      "GET /orgs/{org}/packages/{package_type}/{package_name}/versions"
    ],
    getAllPackageVersionsForPackageOwnedByUser: [
      "GET /users/{username}/packages/{package_type}/{package_name}/versions"
    ],
    getPackageForAuthenticatedUser: [
      "GET /user/packages/{package_type}/{package_name}"
    ],
    getPackageForOrganization: [
      "GET /orgs/{org}/packages/{package_type}/{package_name}"
    ],
    getPackageForUser: [
      "GET /users/{username}/packages/{package_type}/{package_name}"
    ],
    getPackageVersionForAuthenticatedUser: [
      "GET /user/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    getPackageVersionForOrganization: [
      "GET /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    getPackageVersionForUser: [
      "GET /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    listDockerMigrationConflictingPackagesForAuthenticatedUser: [
      "GET /user/docker/conflicts"
    ],
    listDockerMigrationConflictingPackagesForOrganization: [
      "GET /orgs/{org}/docker/conflicts"
    ],
    listDockerMigrationConflictingPackagesForUser: [
      "GET /users/{username}/docker/conflicts"
    ],
    listPackagesForAuthenticatedUser: ["GET /user/packages"],
    listPackagesForOrganization: ["GET /orgs/{org}/packages"],
    listPackagesForUser: ["GET /users/{username}/packages"],
    restorePackageForAuthenticatedUser: [
      "POST /user/packages/{package_type}/{package_name}/restore{?token}"
    ],
    restorePackageForOrg: [
      "POST /orgs/{org}/packages/{package_type}/{package_name}/restore{?token}"
    ],
    restorePackageForUser: [
      "POST /users/{username}/packages/{package_type}/{package_name}/restore{?token}"
    ],
    restorePackageVersionForAuthenticatedUser: [
      "POST /user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
    ],
    restorePackageVersionForOrg: [
      "POST /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
    ],
    restorePackageVersionForUser: [
      "POST /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
    ]
  },
  privateRegistries: {
    createOrgPrivateRegistry: ["POST /orgs/{org}/private-registries"],
    deleteOrgPrivateRegistry: [
      "DELETE /orgs/{org}/private-registries/{secret_name}"
    ],
    getOrgPrivateRegistry: ["GET /orgs/{org}/private-registries/{secret_name}"],
    getOrgPublicKey: ["GET /orgs/{org}/private-registries/public-key"],
    listOrgPrivateRegistries: ["GET /orgs/{org}/private-registries"],
    updateOrgPrivateRegistry: [
      "PATCH /orgs/{org}/private-registries/{secret_name}"
    ]
  },
  pulls: {
    checkIfMerged: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
    create: ["POST /repos/{owner}/{repo}/pulls"],
    createReplyForReviewComment: [
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies"
    ],
    createReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
    createReviewComment: [
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments"
    ],
    deletePendingReview: [
      "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
    ],
    deleteReviewComment: [
      "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}"
    ],
    dismissReview: [
      "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals"
    ],
    get: ["GET /repos/{owner}/{repo}/pulls/{pull_number}"],
    getReview: [
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
    ],
    getReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
    list: ["GET /repos/{owner}/{repo}/pulls"],
    listCommentsForReview: [
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments"
    ],
    listCommits: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/commits"],
    listFiles: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"],
    listRequestedReviewers: [
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
    ],
    listReviewComments: [
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments"
    ],
    listReviewCommentsForRepo: ["GET /repos/{owner}/{repo}/pulls/comments"],
    listReviews: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
    merge: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
    removeRequestedReviewers: [
      "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
    ],
    requestReviewers: [
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
    ],
    submitReview: [
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events"
    ],
    update: ["PATCH /repos/{owner}/{repo}/pulls/{pull_number}"],
    updateBranch: [
      "PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch"
    ],
    updateReview: [
      "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
    ],
    updateReviewComment: [
      "PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}"
    ]
  },
  rateLimit: { get: ["GET /rate_limit"] },
  reactions: {
    createForCommitComment: [
      "POST /repos/{owner}/{repo}/comments/{comment_id}/reactions"
    ],
    createForIssue: [
      "POST /repos/{owner}/{repo}/issues/{issue_number}/reactions"
    ],
    createForIssueComment: [
      "POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"
    ],
    createForPullRequestReviewComment: [
      "POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"
    ],
    createForRelease: [
      "POST /repos/{owner}/{repo}/releases/{release_id}/reactions"
    ],
    createForTeamDiscussionCommentInOrg: [
      "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"
    ],
    createForTeamDiscussionInOrg: [
      "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"
    ],
    deleteForCommitComment: [
      "DELETE /repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}"
    ],
    deleteForIssue: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}"
    ],
    deleteForIssueComment: [
      "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}"
    ],
    deleteForPullRequestComment: [
      "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}"
    ],
    deleteForRelease: [
      "DELETE /repos/{owner}/{repo}/releases/{release_id}/reactions/{reaction_id}"
    ],
    deleteForTeamDiscussion: [
      "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}"
    ],
    deleteForTeamDiscussionComment: [
      "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}"
    ],
    listForCommitComment: [
      "GET /repos/{owner}/{repo}/comments/{comment_id}/reactions"
    ],
    listForIssue: ["GET /repos/{owner}/{repo}/issues/{issue_number}/reactions"],
    listForIssueComment: [
      "GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"
    ],
    listForPullRequestReviewComment: [
      "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"
    ],
    listForRelease: [
      "GET /repos/{owner}/{repo}/releases/{release_id}/reactions"
    ],
    listForTeamDiscussionCommentInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"
    ],
    listForTeamDiscussionInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"
    ]
  },
  repos: {
    acceptInvitation: [
      "PATCH /user/repository_invitations/{invitation_id}",
      {},
      { renamed: ["repos", "acceptInvitationForAuthenticatedUser"] }
    ],
    acceptInvitationForAuthenticatedUser: [
      "PATCH /user/repository_invitations/{invitation_id}"
    ],
    addAppAccessRestrictions: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
      {},
      { mapToData: "apps" }
    ],
    addCollaborator: ["PUT /repos/{owner}/{repo}/collaborators/{username}"],
    addStatusCheckContexts: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
      {},
      { mapToData: "contexts" }
    ],
    addTeamAccessRestrictions: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
      {},
      { mapToData: "teams" }
    ],
    addUserAccessRestrictions: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
      {},
      { mapToData: "users" }
    ],
    cancelPagesDeployment: [
      "POST /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}/cancel"
    ],
    checkAutomatedSecurityFixes: [
      "GET /repos/{owner}/{repo}/automated-security-fixes"
    ],
    checkCollaborator: ["GET /repos/{owner}/{repo}/collaborators/{username}"],
    checkPrivateVulnerabilityReporting: [
      "GET /repos/{owner}/{repo}/private-vulnerability-reporting"
    ],
    checkVulnerabilityAlerts: [
      "GET /repos/{owner}/{repo}/vulnerability-alerts"
    ],
    codeownersErrors: ["GET /repos/{owner}/{repo}/codeowners/errors"],
    compareCommits: ["GET /repos/{owner}/{repo}/compare/{base}...{head}"],
    compareCommitsWithBasehead: [
      "GET /repos/{owner}/{repo}/compare/{basehead}"
    ],
    createAttestation: ["POST /repos/{owner}/{repo}/attestations"],
    createAutolink: ["POST /repos/{owner}/{repo}/autolinks"],
    createCommitComment: [
      "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments"
    ],
    createCommitSignatureProtection: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
    ],
    createCommitStatus: ["POST /repos/{owner}/{repo}/statuses/{sha}"],
    createDeployKey: ["POST /repos/{owner}/{repo}/keys"],
    createDeployment: ["POST /repos/{owner}/{repo}/deployments"],
    createDeploymentBranchPolicy: [
      "POST /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies"
    ],
    createDeploymentProtectionRule: [
      "POST /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules"
    ],
    createDeploymentStatus: [
      "POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"
    ],
    createDispatchEvent: ["POST /repos/{owner}/{repo}/dispatches"],
    createForAuthenticatedUser: ["POST /user/repos"],
    createFork: ["POST /repos/{owner}/{repo}/forks"],
    createInOrg: ["POST /orgs/{org}/repos"],
    createOrUpdateCustomPropertiesValues: [
      "PATCH /repos/{owner}/{repo}/properties/values"
    ],
    createOrUpdateEnvironment: [
      "PUT /repos/{owner}/{repo}/environments/{environment_name}"
    ],
    createOrUpdateFileContents: ["PUT /repos/{owner}/{repo}/contents/{path}"],
    createOrgRuleset: ["POST /orgs/{org}/rulesets"],
    createPagesDeployment: ["POST /repos/{owner}/{repo}/pages/deployments"],
    createPagesSite: ["POST /repos/{owner}/{repo}/pages"],
    createRelease: ["POST /repos/{owner}/{repo}/releases"],
    createRepoRuleset: ["POST /repos/{owner}/{repo}/rulesets"],
    createUsingTemplate: [
      "POST /repos/{template_owner}/{template_repo}/generate"
    ],
    createWebhook: ["POST /repos/{owner}/{repo}/hooks"],
    declineInvitation: [
      "DELETE /user/repository_invitations/{invitation_id}",
      {},
      { renamed: ["repos", "declineInvitationForAuthenticatedUser"] }
    ],
    declineInvitationForAuthenticatedUser: [
      "DELETE /user/repository_invitations/{invitation_id}"
    ],
    delete: ["DELETE /repos/{owner}/{repo}"],
    deleteAccessRestrictions: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"
    ],
    deleteAdminBranchProtection: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
    ],
    deleteAnEnvironment: [
      "DELETE /repos/{owner}/{repo}/environments/{environment_name}"
    ],
    deleteAutolink: ["DELETE /repos/{owner}/{repo}/autolinks/{autolink_id}"],
    deleteBranchProtection: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection"
    ],
    deleteCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}"],
    deleteCommitSignatureProtection: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
    ],
    deleteDeployKey: ["DELETE /repos/{owner}/{repo}/keys/{key_id}"],
    deleteDeployment: [
      "DELETE /repos/{owner}/{repo}/deployments/{deployment_id}"
    ],
    deleteDeploymentBranchPolicy: [
      "DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
    ],
    deleteFile: ["DELETE /repos/{owner}/{repo}/contents/{path}"],
    deleteInvitation: [
      "DELETE /repos/{owner}/{repo}/invitations/{invitation_id}"
    ],
    deleteOrgRuleset: ["DELETE /orgs/{org}/rulesets/{ruleset_id}"],
    deletePagesSite: ["DELETE /repos/{owner}/{repo}/pages"],
    deletePullRequestReviewProtection: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
    ],
    deleteRelease: ["DELETE /repos/{owner}/{repo}/releases/{release_id}"],
    deleteReleaseAsset: [
      "DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}"
    ],
    deleteRepoRuleset: ["DELETE /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
    deleteWebhook: ["DELETE /repos/{owner}/{repo}/hooks/{hook_id}"],
    disableAutomatedSecurityFixes: [
      "DELETE /repos/{owner}/{repo}/automated-security-fixes"
    ],
    disableDeploymentProtectionRule: [
      "DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}"
    ],
    disablePrivateVulnerabilityReporting: [
      "DELETE /repos/{owner}/{repo}/private-vulnerability-reporting"
    ],
    disableVulnerabilityAlerts: [
      "DELETE /repos/{owner}/{repo}/vulnerability-alerts"
    ],
    downloadArchive: [
      "GET /repos/{owner}/{repo}/zipball/{ref}",
      {},
      { renamed: ["repos", "downloadZipballArchive"] }
    ],
    downloadTarballArchive: ["GET /repos/{owner}/{repo}/tarball/{ref}"],
    downloadZipballArchive: ["GET /repos/{owner}/{repo}/zipball/{ref}"],
    enableAutomatedSecurityFixes: [
      "PUT /repos/{owner}/{repo}/automated-security-fixes"
    ],
    enablePrivateVulnerabilityReporting: [
      "PUT /repos/{owner}/{repo}/private-vulnerability-reporting"
    ],
    enableVulnerabilityAlerts: [
      "PUT /repos/{owner}/{repo}/vulnerability-alerts"
    ],
    generateReleaseNotes: [
      "POST /repos/{owner}/{repo}/releases/generate-notes"
    ],
    get: ["GET /repos/{owner}/{repo}"],
    getAccessRestrictions: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"
    ],
    getAdminBranchProtection: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
    ],
    getAllDeploymentProtectionRules: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules"
    ],
    getAllEnvironments: ["GET /repos/{owner}/{repo}/environments"],
    getAllStatusCheckContexts: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts"
    ],
    getAllTopics: ["GET /repos/{owner}/{repo}/topics"],
    getAppsWithAccessToProtectedBranch: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps"
    ],
    getAutolink: ["GET /repos/{owner}/{repo}/autolinks/{autolink_id}"],
    getBranch: ["GET /repos/{owner}/{repo}/branches/{branch}"],
    getBranchProtection: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection"
    ],
    getBranchRules: ["GET /repos/{owner}/{repo}/rules/branches/{branch}"],
    getClones: ["GET /repos/{owner}/{repo}/traffic/clones"],
    getCodeFrequencyStats: ["GET /repos/{owner}/{repo}/stats/code_frequency"],
    getCollaboratorPermissionLevel: [
      "GET /repos/{owner}/{repo}/collaborators/{username}/permission"
    ],
    getCombinedStatusForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/status"],
    getCommit: ["GET /repos/{owner}/{repo}/commits/{ref}"],
    getCommitActivityStats: ["GET /repos/{owner}/{repo}/stats/commit_activity"],
    getCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}"],
    getCommitSignatureProtection: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
    ],
    getCommunityProfileMetrics: ["GET /repos/{owner}/{repo}/community/profile"],
    getContent: ["GET /repos/{owner}/{repo}/contents/{path}"],
    getContributorsStats: ["GET /repos/{owner}/{repo}/stats/contributors"],
    getCustomDeploymentProtectionRule: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}"
    ],
    getCustomPropertiesValues: ["GET /repos/{owner}/{repo}/properties/values"],
    getDeployKey: ["GET /repos/{owner}/{repo}/keys/{key_id}"],
    getDeployment: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}"],
    getDeploymentBranchPolicy: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
    ],
    getDeploymentStatus: [
      "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}"
    ],
    getEnvironment: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}"
    ],
    getLatestPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/latest"],
    getLatestRelease: ["GET /repos/{owner}/{repo}/releases/latest"],
    getOrgRuleSuite: ["GET /orgs/{org}/rulesets/rule-suites/{rule_suite_id}"],
    getOrgRuleSuites: ["GET /orgs/{org}/rulesets/rule-suites"],
    getOrgRuleset: ["GET /orgs/{org}/rulesets/{ruleset_id}"],
    getOrgRulesets: ["GET /orgs/{org}/rulesets"],
    getPages: ["GET /repos/{owner}/{repo}/pages"],
    getPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/{build_id}"],
    getPagesDeployment: [
      "GET /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}"
    ],
    getPagesHealthCheck: ["GET /repos/{owner}/{repo}/pages/health"],
    getParticipationStats: ["GET /repos/{owner}/{repo}/stats/participation"],
    getPullRequestReviewProtection: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
    ],
    getPunchCardStats: ["GET /repos/{owner}/{repo}/stats/punch_card"],
    getReadme: ["GET /repos/{owner}/{repo}/readme"],
    getReadmeInDirectory: ["GET /repos/{owner}/{repo}/readme/{dir}"],
    getRelease: ["GET /repos/{owner}/{repo}/releases/{release_id}"],
    getReleaseAsset: ["GET /repos/{owner}/{repo}/releases/assets/{asset_id}"],
    getReleaseByTag: ["GET /repos/{owner}/{repo}/releases/tags/{tag}"],
    getRepoRuleSuite: [
      "GET /repos/{owner}/{repo}/rulesets/rule-suites/{rule_suite_id}"
    ],
    getRepoRuleSuites: ["GET /repos/{owner}/{repo}/rulesets/rule-suites"],
    getRepoRuleset: ["GET /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
    getRepoRulesetHistory: [
      "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history"
    ],
    getRepoRulesetVersion: [
      "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history/{version_id}"
    ],
    getRepoRulesets: ["GET /repos/{owner}/{repo}/rulesets"],
    getStatusChecksProtection: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
    ],
    getTeamsWithAccessToProtectedBranch: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams"
    ],
    getTopPaths: ["GET /repos/{owner}/{repo}/traffic/popular/paths"],
    getTopReferrers: ["GET /repos/{owner}/{repo}/traffic/popular/referrers"],
    getUsersWithAccessToProtectedBranch: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users"
    ],
    getViews: ["GET /repos/{owner}/{repo}/traffic/views"],
    getWebhook: ["GET /repos/{owner}/{repo}/hooks/{hook_id}"],
    getWebhookConfigForRepo: [
      "GET /repos/{owner}/{repo}/hooks/{hook_id}/config"
    ],
    getWebhookDelivery: [
      "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}"
    ],
    listActivities: ["GET /repos/{owner}/{repo}/activity"],
    listAttestations: [
      "GET /repos/{owner}/{repo}/attestations/{subject_digest}"
    ],
    listAutolinks: ["GET /repos/{owner}/{repo}/autolinks"],
    listBranches: ["GET /repos/{owner}/{repo}/branches"],
    listBranchesForHeadCommit: [
      "GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head"
    ],
    listCollaborators: ["GET /repos/{owner}/{repo}/collaborators"],
    listCommentsForCommit: [
      "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments"
    ],
    listCommitCommentsForRepo: ["GET /repos/{owner}/{repo}/comments"],
    listCommitStatusesForRef: [
      "GET /repos/{owner}/{repo}/commits/{ref}/statuses"
    ],
    listCommits: ["GET /repos/{owner}/{repo}/commits"],
    listContributors: ["GET /repos/{owner}/{repo}/contributors"],
    listCustomDeploymentRuleIntegrations: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps"
    ],
    listDeployKeys: ["GET /repos/{owner}/{repo}/keys"],
    listDeploymentBranchPolicies: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies"
    ],
    listDeploymentStatuses: [
      "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"
    ],
    listDeployments: ["GET /repos/{owner}/{repo}/deployments"],
    listForAuthenticatedUser: ["GET /user/repos"],
    listForOrg: ["GET /orgs/{org}/repos"],
    listForUser: ["GET /users/{username}/repos"],
    listForks: ["GET /repos/{owner}/{repo}/forks"],
    listInvitations: ["GET /repos/{owner}/{repo}/invitations"],
    listInvitationsForAuthenticatedUser: ["GET /user/repository_invitations"],
    listLanguages: ["GET /repos/{owner}/{repo}/languages"],
    listPagesBuilds: ["GET /repos/{owner}/{repo}/pages/builds"],
    listPublic: ["GET /repositories"],
    listPullRequestsAssociatedWithCommit: [
      "GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls"
    ],
    listReleaseAssets: [
      "GET /repos/{owner}/{repo}/releases/{release_id}/assets"
    ],
    listReleases: ["GET /repos/{owner}/{repo}/releases"],
    listTags: ["GET /repos/{owner}/{repo}/tags"],
    listTeams: ["GET /repos/{owner}/{repo}/teams"],
    listWebhookDeliveries: [
      "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries"
    ],
    listWebhooks: ["GET /repos/{owner}/{repo}/hooks"],
    merge: ["POST /repos/{owner}/{repo}/merges"],
    mergeUpstream: ["POST /repos/{owner}/{repo}/merge-upstream"],
    pingWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/pings"],
    redeliverWebhookDelivery: [
      "POST /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"
    ],
    removeAppAccessRestrictions: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
      {},
      { mapToData: "apps" }
    ],
    removeCollaborator: [
      "DELETE /repos/{owner}/{repo}/collaborators/{username}"
    ],
    removeStatusCheckContexts: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
      {},
      { mapToData: "contexts" }
    ],
    removeStatusCheckProtection: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
    ],
    removeTeamAccessRestrictions: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
      {},
      { mapToData: "teams" }
    ],
    removeUserAccessRestrictions: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
      {},
      { mapToData: "users" }
    ],
    renameBranch: ["POST /repos/{owner}/{repo}/branches/{branch}/rename"],
    replaceAllTopics: ["PUT /repos/{owner}/{repo}/topics"],
    requestPagesBuild: ["POST /repos/{owner}/{repo}/pages/builds"],
    setAdminBranchProtection: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
    ],
    setAppAccessRestrictions: [
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
      {},
      { mapToData: "apps" }
    ],
    setStatusCheckContexts: [
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
      {},
      { mapToData: "contexts" }
    ],
    setTeamAccessRestrictions: [
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
      {},
      { mapToData: "teams" }
    ],
    setUserAccessRestrictions: [
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
      {},
      { mapToData: "users" }
    ],
    testPushWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/tests"],
    transfer: ["POST /repos/{owner}/{repo}/transfer"],
    update: ["PATCH /repos/{owner}/{repo}"],
    updateBranchProtection: [
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection"
    ],
    updateCommitComment: ["PATCH /repos/{owner}/{repo}/comments/{comment_id}"],
    updateDeploymentBranchPolicy: [
      "PUT /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
    ],
    updateInformationAboutPagesSite: ["PUT /repos/{owner}/{repo}/pages"],
    updateInvitation: [
      "PATCH /repos/{owner}/{repo}/invitations/{invitation_id}"
    ],
    updateOrgRuleset: ["PUT /orgs/{org}/rulesets/{ruleset_id}"],
    updatePullRequestReviewProtection: [
      "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
    ],
    updateRelease: ["PATCH /repos/{owner}/{repo}/releases/{release_id}"],
    updateReleaseAsset: [
      "PATCH /repos/{owner}/{repo}/releases/assets/{asset_id}"
    ],
    updateRepoRuleset: ["PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
    updateStatusCheckPotection: [
      "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
      {},
      { renamed: ["repos", "updateStatusCheckProtection"] }
    ],
    updateStatusCheckProtection: [
      "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
    ],
    updateWebhook: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}"],
    updateWebhookConfigForRepo: [
      "PATCH /repos/{owner}/{repo}/hooks/{hook_id}/config"
    ],
    uploadReleaseAsset: [
      "POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}",
      { baseUrl: "https://uploads.github.com" }
    ]
  },
  search: {
    code: ["GET /search/code"],
    commits: ["GET /search/commits"],
    issuesAndPullRequests: [
      "GET /search/issues",
      {},
      {
        deprecated: "octokit.rest.search.issuesAndPullRequests() is deprecated, see https://docs.github.com/rest/search/search#search-issues-and-pull-requests"
      }
    ],
    labels: ["GET /search/labels"],
    repos: ["GET /search/repositories"],
    topics: ["GET /search/topics"],
    users: ["GET /search/users"]
  },
  secretScanning: {
    createPushProtectionBypass: [
      "POST /repos/{owner}/{repo}/secret-scanning/push-protection-bypasses"
    ],
    getAlert: [
      "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"
    ],
    getScanHistory: ["GET /repos/{owner}/{repo}/secret-scanning/scan-history"],
    listAlertsForEnterprise: [
      "GET /enterprises/{enterprise}/secret-scanning/alerts"
    ],
    listAlertsForOrg: ["GET /orgs/{org}/secret-scanning/alerts"],
    listAlertsForRepo: ["GET /repos/{owner}/{repo}/secret-scanning/alerts"],
    listLocationsForAlert: [
      "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations"
    ],
    updateAlert: [
      "PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"
    ]
  },
  securityAdvisories: {
    createFork: [
      "POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/forks"
    ],
    createPrivateVulnerabilityReport: [
      "POST /repos/{owner}/{repo}/security-advisories/reports"
    ],
    createRepositoryAdvisory: [
      "POST /repos/{owner}/{repo}/security-advisories"
    ],
    createRepositoryAdvisoryCveRequest: [
      "POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/cve"
    ],
    getGlobalAdvisory: ["GET /advisories/{ghsa_id}"],
    getRepositoryAdvisory: [
      "GET /repos/{owner}/{repo}/security-advisories/{ghsa_id}"
    ],
    listGlobalAdvisories: ["GET /advisories"],
    listOrgRepositoryAdvisories: ["GET /orgs/{org}/security-advisories"],
    listRepositoryAdvisories: ["GET /repos/{owner}/{repo}/security-advisories"],
    updateRepositoryAdvisory: [
      "PATCH /repos/{owner}/{repo}/security-advisories/{ghsa_id}"
    ]
  },
  teams: {
    addOrUpdateMembershipForUserInOrg: [
      "PUT /orgs/{org}/teams/{team_slug}/memberships/{username}"
    ],
    addOrUpdateRepoPermissionsInOrg: [
      "PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
    ],
    checkPermissionsForRepoInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
    ],
    create: ["POST /orgs/{org}/teams"],
    createDiscussionCommentInOrg: [
      "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"
    ],
    createDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions"],
    deleteDiscussionCommentInOrg: [
      "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
    ],
    deleteDiscussionInOrg: [
      "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
    ],
    deleteInOrg: ["DELETE /orgs/{org}/teams/{team_slug}"],
    getByName: ["GET /orgs/{org}/teams/{team_slug}"],
    getDiscussionCommentInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
    ],
    getDiscussionInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
    ],
    getMembershipForUserInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/memberships/{username}"
    ],
    list: ["GET /orgs/{org}/teams"],
    listChildInOrg: ["GET /orgs/{org}/teams/{team_slug}/teams"],
    listDiscussionCommentsInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"
    ],
    listDiscussionsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions"],
    listForAuthenticatedUser: ["GET /user/teams"],
    listMembersInOrg: ["GET /orgs/{org}/teams/{team_slug}/members"],
    listPendingInvitationsInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/invitations"
    ],
    listReposInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos"],
    removeMembershipForUserInOrg: [
      "DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}"
    ],
    removeRepoInOrg: [
      "DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
    ],
    updateDiscussionCommentInOrg: [
      "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
    ],
    updateDiscussionInOrg: [
      "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
    ],
    updateInOrg: ["PATCH /orgs/{org}/teams/{team_slug}"]
  },
  users: {
    addEmailForAuthenticated: [
      "POST /user/emails",
      {},
      { renamed: ["users", "addEmailForAuthenticatedUser"] }
    ],
    addEmailForAuthenticatedUser: ["POST /user/emails"],
    addSocialAccountForAuthenticatedUser: ["POST /user/social_accounts"],
    block: ["PUT /user/blocks/{username}"],
    checkBlocked: ["GET /user/blocks/{username}"],
    checkFollowingForUser: ["GET /users/{username}/following/{target_user}"],
    checkPersonIsFollowedByAuthenticated: ["GET /user/following/{username}"],
    createGpgKeyForAuthenticated: [
      "POST /user/gpg_keys",
      {},
      { renamed: ["users", "createGpgKeyForAuthenticatedUser"] }
    ],
    createGpgKeyForAuthenticatedUser: ["POST /user/gpg_keys"],
    createPublicSshKeyForAuthenticated: [
      "POST /user/keys",
      {},
      { renamed: ["users", "createPublicSshKeyForAuthenticatedUser"] }
    ],
    createPublicSshKeyForAuthenticatedUser: ["POST /user/keys"],
    createSshSigningKeyForAuthenticatedUser: ["POST /user/ssh_signing_keys"],
    deleteEmailForAuthenticated: [
      "DELETE /user/emails",
      {},
      { renamed: ["users", "deleteEmailForAuthenticatedUser"] }
    ],
    deleteEmailForAuthenticatedUser: ["DELETE /user/emails"],
    deleteGpgKeyForAuthenticated: [
      "DELETE /user/gpg_keys/{gpg_key_id}",
      {},
      { renamed: ["users", "deleteGpgKeyForAuthenticatedUser"] }
    ],
    deleteGpgKeyForAuthenticatedUser: ["DELETE /user/gpg_keys/{gpg_key_id}"],
    deletePublicSshKeyForAuthenticated: [
      "DELETE /user/keys/{key_id}",
      {},
      { renamed: ["users", "deletePublicSshKeyForAuthenticatedUser"] }
    ],
    deletePublicSshKeyForAuthenticatedUser: ["DELETE /user/keys/{key_id}"],
    deleteSocialAccountForAuthenticatedUser: ["DELETE /user/social_accounts"],
    deleteSshSigningKeyForAuthenticatedUser: [
      "DELETE /user/ssh_signing_keys/{ssh_signing_key_id}"
    ],
    follow: ["PUT /user/following/{username}"],
    getAuthenticated: ["GET /user"],
    getById: ["GET /user/{account_id}"],
    getByUsername: ["GET /users/{username}"],
    getContextForUser: ["GET /users/{username}/hovercard"],
    getGpgKeyForAuthenticated: [
      "GET /user/gpg_keys/{gpg_key_id}",
      {},
      { renamed: ["users", "getGpgKeyForAuthenticatedUser"] }
    ],
    getGpgKeyForAuthenticatedUser: ["GET /user/gpg_keys/{gpg_key_id}"],
    getPublicSshKeyForAuthenticated: [
      "GET /user/keys/{key_id}",
      {},
      { renamed: ["users", "getPublicSshKeyForAuthenticatedUser"] }
    ],
    getPublicSshKeyForAuthenticatedUser: ["GET /user/keys/{key_id}"],
    getSshSigningKeyForAuthenticatedUser: [
      "GET /user/ssh_signing_keys/{ssh_signing_key_id}"
    ],
    list: ["GET /users"],
    listAttestations: ["GET /users/{username}/attestations/{subject_digest}"],
    listBlockedByAuthenticated: [
      "GET /user/blocks",
      {},
      { renamed: ["users", "listBlockedByAuthenticatedUser"] }
    ],
    listBlockedByAuthenticatedUser: ["GET /user/blocks"],
    listEmailsForAuthenticated: [
      "GET /user/emails",
      {},
      { renamed: ["users", "listEmailsForAuthenticatedUser"] }
    ],
    listEmailsForAuthenticatedUser: ["GET /user/emails"],
    listFollowedByAuthenticated: [
      "GET /user/following",
      {},
      { renamed: ["users", "listFollowedByAuthenticatedUser"] }
    ],
    listFollowedByAuthenticatedUser: ["GET /user/following"],
    listFollowersForAuthenticatedUser: ["GET /user/followers"],
    listFollowersForUser: ["GET /users/{username}/followers"],
    listFollowingForUser: ["GET /users/{username}/following"],
    listGpgKeysForAuthenticated: [
      "GET /user/gpg_keys",
      {},
      { renamed: ["users", "listGpgKeysForAuthenticatedUser"] }
    ],
    listGpgKeysForAuthenticatedUser: ["GET /user/gpg_keys"],
    listGpgKeysForUser: ["GET /users/{username}/gpg_keys"],
    listPublicEmailsForAuthenticated: [
      "GET /user/public_emails",
      {},
      { renamed: ["users", "listPublicEmailsForAuthenticatedUser"] }
    ],
    listPublicEmailsForAuthenticatedUser: ["GET /user/public_emails"],
    listPublicKeysForUser: ["GET /users/{username}/keys"],
    listPublicSshKeysForAuthenticated: [
      "GET /user/keys",
      {},
      { renamed: ["users", "listPublicSshKeysForAuthenticatedUser"] }
    ],
    listPublicSshKeysForAuthenticatedUser: ["GET /user/keys"],
    listSocialAccountsForAuthenticatedUser: ["GET /user/social_accounts"],
    listSocialAccountsForUser: ["GET /users/{username}/social_accounts"],
    listSshSigningKeysForAuthenticatedUser: ["GET /user/ssh_signing_keys"],
    listSshSigningKeysForUser: ["GET /users/{username}/ssh_signing_keys"],
    setPrimaryEmailVisibilityForAuthenticated: [
      "PATCH /user/email/visibility",
      {},
      { renamed: ["users", "setPrimaryEmailVisibilityForAuthenticatedUser"] }
    ],
    setPrimaryEmailVisibilityForAuthenticatedUser: [
      "PATCH /user/email/visibility"
    ],
    unblock: ["DELETE /user/blocks/{username}"],
    unfollow: ["DELETE /user/following/{username}"],
    updateAuthenticated: ["PATCH /user"]
  }
};
var endpoints_default = Endpoints;
const endpointMethodsMap = /* @__PURE__ */ new Map();
for (const [scope, endpoints] of Object.entries(endpoints_default)) {
  for (const [methodName, endpoint2] of Object.entries(endpoints)) {
    const [route, defaults, decorations] = endpoint2;
    const [method, url] = route.split(/ /);
    const endpointDefaults = Object.assign(
      {
        method,
        url
      },
      defaults
    );
    if (!endpointMethodsMap.has(scope)) {
      endpointMethodsMap.set(scope, /* @__PURE__ */ new Map());
    }
    endpointMethodsMap.get(scope).set(methodName, {
      scope,
      methodName,
      endpointDefaults,
      decorations
    });
  }
}
const handler = {
  has({ scope }, methodName) {
    return endpointMethodsMap.get(scope).has(methodName);
  },
  getOwnPropertyDescriptor(target, methodName) {
    return {
      value: this.get(target, methodName),
      // ensures method is in the cache
      configurable: true,
      writable: true,
      enumerable: true
    };
  },
  defineProperty(target, methodName, descriptor) {
    Object.defineProperty(target.cache, methodName, descriptor);
    return true;
  },
  deleteProperty(target, methodName) {
    delete target.cache[methodName];
    return true;
  },
  ownKeys({ scope }) {
    return [...endpointMethodsMap.get(scope).keys()];
  },
  set(target, methodName, value) {
    return target.cache[methodName] = value;
  },
  get({ octokit, scope, cache }, methodName) {
    if (cache[methodName]) {
      return cache[methodName];
    }
    const method = endpointMethodsMap.get(scope).get(methodName);
    if (!method) {
      return void 0;
    }
    const { endpointDefaults, decorations } = method;
    if (decorations) {
      cache[methodName] = decorate(
        octokit,
        scope,
        methodName,
        endpointDefaults,
        decorations
      );
    } else {
      cache[methodName] = octokit.request.defaults(endpointDefaults);
    }
    return cache[methodName];
  }
};
function endpointsToMethods(octokit) {
  const newMethods = {};
  for (const scope of endpointMethodsMap.keys()) {
    newMethods[scope] = new Proxy({ octokit, scope, cache: {} }, handler);
  }
  return newMethods;
}
function decorate(octokit, scope, methodName, defaults, decorations) {
  const requestWithDefaults = octokit.request.defaults(defaults);
  function withDecorations(...args) {
    let options = requestWithDefaults.endpoint.merge(...args);
    if (decorations.mapToData) {
      options = Object.assign({}, options, {
        data: options[decorations.mapToData],
        [decorations.mapToData]: void 0
      });
      return requestWithDefaults(options);
    }
    if (decorations.renamed) {
      const [newScope, newMethodName] = decorations.renamed;
      octokit.log.warn(
        `octokit.${scope}.${methodName}() has been renamed to octokit.${newScope}.${newMethodName}()`
      );
    }
    if (decorations.deprecated) {
      octokit.log.warn(decorations.deprecated);
    }
    if (decorations.renamedParameters) {
      const options2 = requestWithDefaults.endpoint.merge(...args);
      for (const [name, alias] of Object.entries(
        decorations.renamedParameters
      )) {
        if (name in options2) {
          octokit.log.warn(
            `"${name}" parameter is deprecated for "octokit.${scope}.${methodName}()". Use "${alias}" instead`
          );
          if (!(alias in options2)) {
            options2[alias] = options2[name];
          }
          delete options2[name];
        }
      }
      return requestWithDefaults(options2);
    }
    return requestWithDefaults(...args);
  }
  return Object.assign(withDecorations, requestWithDefaults);
}
function restEndpointMethods(octokit) {
  const api = endpointsToMethods(octokit);
  return {
    rest: api
  };
}
restEndpointMethods.VERSION = VERSION$3;
var light = { exports: {} };
(function(module2, exports$1) {
  (function(global2, factory) {
    module2.exports = factory();
  })(commonjsGlobal, function() {
    var commonjsGlobal$1 = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : {};
    function getCjsExportFromNamespace(n) {
      return n && n["default"] || n;
    }
    var load = function(received, defaults, onto = {}) {
      var k, ref, v;
      for (k in defaults) {
        v = defaults[k];
        onto[k] = (ref = received[k]) != null ? ref : v;
      }
      return onto;
    };
    var overwrite = function(received, defaults, onto = {}) {
      var k, v;
      for (k in received) {
        v = received[k];
        if (defaults[k] !== void 0) {
          onto[k] = v;
        }
      }
      return onto;
    };
    var parser = {
      load,
      overwrite
    };
    var DLList;
    DLList = class DLList {
      constructor(incr, decr) {
        this.incr = incr;
        this.decr = decr;
        this._first = null;
        this._last = null;
        this.length = 0;
      }
      push(value) {
        var node;
        this.length++;
        if (typeof this.incr === "function") {
          this.incr();
        }
        node = {
          value,
          prev: this._last,
          next: null
        };
        if (this._last != null) {
          this._last.next = node;
          this._last = node;
        } else {
          this._first = this._last = node;
        }
        return void 0;
      }
      shift() {
        var value;
        if (this._first == null) {
          return;
        } else {
          this.length--;
          if (typeof this.decr === "function") {
            this.decr();
          }
        }
        value = this._first.value;
        if ((this._first = this._first.next) != null) {
          this._first.prev = null;
        } else {
          this._last = null;
        }
        return value;
      }
      first() {
        if (this._first != null) {
          return this._first.value;
        }
      }
      getArray() {
        var node, ref, results;
        node = this._first;
        results = [];
        while (node != null) {
          results.push((ref = node, node = node.next, ref.value));
        }
        return results;
      }
      forEachShift(cb) {
        var node;
        node = this.shift();
        while (node != null) {
          cb(node), node = this.shift();
        }
        return void 0;
      }
      debug() {
        var node, ref, ref1, ref2, results;
        node = this._first;
        results = [];
        while (node != null) {
          results.push((ref = node, node = node.next, {
            value: ref.value,
            prev: (ref1 = ref.prev) != null ? ref1.value : void 0,
            next: (ref2 = ref.next) != null ? ref2.value : void 0
          }));
        }
        return results;
      }
    };
    var DLList_1 = DLList;
    var Events;
    Events = class Events {
      constructor(instance) {
        this.instance = instance;
        this._events = {};
        if (this.instance.on != null || this.instance.once != null || this.instance.removeAllListeners != null) {
          throw new Error("An Emitter already exists for this object");
        }
        this.instance.on = (name, cb) => {
          return this._addListener(name, "many", cb);
        };
        this.instance.once = (name, cb) => {
          return this._addListener(name, "once", cb);
        };
        this.instance.removeAllListeners = (name = null) => {
          if (name != null) {
            return delete this._events[name];
          } else {
            return this._events = {};
          }
        };
      }
      _addListener(name, status, cb) {
        var base;
        if ((base = this._events)[name] == null) {
          base[name] = [];
        }
        this._events[name].push({ cb, status });
        return this.instance;
      }
      listenerCount(name) {
        if (this._events[name] != null) {
          return this._events[name].length;
        } else {
          return 0;
        }
      }
      async trigger(name, ...args) {
        var e, promises;
        try {
          if (name !== "debug") {
            this.trigger("debug", `Event triggered: ${name}`, args);
          }
          if (this._events[name] == null) {
            return;
          }
          this._events[name] = this._events[name].filter(function(listener) {
            return listener.status !== "none";
          });
          promises = this._events[name].map(async (listener) => {
            var e2, returned;
            if (listener.status === "none") {
              return;
            }
            if (listener.status === "once") {
              listener.status = "none";
            }
            try {
              returned = typeof listener.cb === "function" ? listener.cb(...args) : void 0;
              if (typeof (returned != null ? returned.then : void 0) === "function") {
                return await returned;
              } else {
                return returned;
              }
            } catch (error) {
              e2 = error;
              {
                this.trigger("error", e2);
              }
              return null;
            }
          });
          return (await Promise.all(promises)).find(function(x) {
            return x != null;
          });
        } catch (error) {
          e = error;
          {
            this.trigger("error", e);
          }
          return null;
        }
      }
    };
    var Events_1 = Events;
    var DLList$1, Events$1, Queues;
    DLList$1 = DLList_1;
    Events$1 = Events_1;
    Queues = class Queues {
      constructor(num_priorities) {
        this.Events = new Events$1(this);
        this._length = 0;
        this._lists = (function() {
          var j, ref, results;
          results = [];
          for (j = 1, ref = num_priorities; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? ++j : --j) {
            results.push(new DLList$1(() => {
              return this.incr();
            }, () => {
              return this.decr();
            }));
          }
          return results;
        }).call(this);
      }
      incr() {
        if (this._length++ === 0) {
          return this.Events.trigger("leftzero");
        }
      }
      decr() {
        if (--this._length === 0) {
          return this.Events.trigger("zero");
        }
      }
      push(job) {
        return this._lists[job.options.priority].push(job);
      }
      queued(priority) {
        if (priority != null) {
          return this._lists[priority].length;
        } else {
          return this._length;
        }
      }
      shiftAll(fn) {
        return this._lists.forEach(function(list) {
          return list.forEachShift(fn);
        });
      }
      getFirst(arr = this._lists) {
        var j, len, list;
        for (j = 0, len = arr.length; j < len; j++) {
          list = arr[j];
          if (list.length > 0) {
            return list;
          }
        }
        return [];
      }
      shiftLastFrom(priority) {
        return this.getFirst(this._lists.slice(priority).reverse()).shift();
      }
    };
    var Queues_1 = Queues;
    var BottleneckError;
    BottleneckError = class BottleneckError extends Error {
    };
    var BottleneckError_1 = BottleneckError;
    var BottleneckError$1, DEFAULT_PRIORITY, Job, NUM_PRIORITIES, parser$1;
    NUM_PRIORITIES = 10;
    DEFAULT_PRIORITY = 5;
    parser$1 = parser;
    BottleneckError$1 = BottleneckError_1;
    Job = class Job {
      constructor(task, args, options, jobDefaults, rejectOnDrop, Events2, _states, Promise2) {
        this.task = task;
        this.args = args;
        this.rejectOnDrop = rejectOnDrop;
        this.Events = Events2;
        this._states = _states;
        this.Promise = Promise2;
        this.options = parser$1.load(options, jobDefaults);
        this.options.priority = this._sanitizePriority(this.options.priority);
        if (this.options.id === jobDefaults.id) {
          this.options.id = `${this.options.id}-${this._randomIndex()}`;
        }
        this.promise = new this.Promise((_resolve, _reject) => {
          this._resolve = _resolve;
          this._reject = _reject;
        });
        this.retryCount = 0;
      }
      _sanitizePriority(priority) {
        var sProperty;
        sProperty = ~~priority !== priority ? DEFAULT_PRIORITY : priority;
        if (sProperty < 0) {
          return 0;
        } else if (sProperty > NUM_PRIORITIES - 1) {
          return NUM_PRIORITIES - 1;
        } else {
          return sProperty;
        }
      }
      _randomIndex() {
        return Math.random().toString(36).slice(2);
      }
      doDrop({ error, message = "This job has been dropped by Bottleneck" } = {}) {
        if (this._states.remove(this.options.id)) {
          if (this.rejectOnDrop) {
            this._reject(error != null ? error : new BottleneckError$1(message));
          }
          this.Events.trigger("dropped", { args: this.args, options: this.options, task: this.task, promise: this.promise });
          return true;
        } else {
          return false;
        }
      }
      _assertStatus(expected) {
        var status;
        status = this._states.jobStatus(this.options.id);
        if (!(status === expected || expected === "DONE" && status === null)) {
          throw new BottleneckError$1(`Invalid job status ${status}, expected ${expected}. Please open an issue at https://github.com/SGrondin/bottleneck/issues`);
        }
      }
      doReceive() {
        this._states.start(this.options.id);
        return this.Events.trigger("received", { args: this.args, options: this.options });
      }
      doQueue(reachedHWM, blocked) {
        this._assertStatus("RECEIVED");
        this._states.next(this.options.id);
        return this.Events.trigger("queued", { args: this.args, options: this.options, reachedHWM, blocked });
      }
      doRun() {
        if (this.retryCount === 0) {
          this._assertStatus("QUEUED");
          this._states.next(this.options.id);
        } else {
          this._assertStatus("EXECUTING");
        }
        return this.Events.trigger("scheduled", { args: this.args, options: this.options });
      }
      async doExecute(chained, clearGlobalState, run, free) {
        var error, eventInfo, passed;
        if (this.retryCount === 0) {
          this._assertStatus("RUNNING");
          this._states.next(this.options.id);
        } else {
          this._assertStatus("EXECUTING");
        }
        eventInfo = { args: this.args, options: this.options, retryCount: this.retryCount };
        this.Events.trigger("executing", eventInfo);
        try {
          passed = await (chained != null ? chained.schedule(this.options, this.task, ...this.args) : this.task(...this.args));
          if (clearGlobalState()) {
            this.doDone(eventInfo);
            await free(this.options, eventInfo);
            this._assertStatus("DONE");
            return this._resolve(passed);
          }
        } catch (error1) {
          error = error1;
          return this._onFailure(error, eventInfo, clearGlobalState, run, free);
        }
      }
      doExpire(clearGlobalState, run, free) {
        var error, eventInfo;
        if (this._states.jobStatus(this.options.id === "RUNNING")) {
          this._states.next(this.options.id);
        }
        this._assertStatus("EXECUTING");
        eventInfo = { args: this.args, options: this.options, retryCount: this.retryCount };
        error = new BottleneckError$1(`This job timed out after ${this.options.expiration} ms.`);
        return this._onFailure(error, eventInfo, clearGlobalState, run, free);
      }
      async _onFailure(error, eventInfo, clearGlobalState, run, free) {
        var retry2, retryAfter;
        if (clearGlobalState()) {
          retry2 = await this.Events.trigger("failed", error, eventInfo);
          if (retry2 != null) {
            retryAfter = ~~retry2;
            this.Events.trigger("retry", `Retrying ${this.options.id} after ${retryAfter} ms`, eventInfo);
            this.retryCount++;
            return run(retryAfter);
          } else {
            this.doDone(eventInfo);
            await free(this.options, eventInfo);
            this._assertStatus("DONE");
            return this._reject(error);
          }
        }
      }
      doDone(eventInfo) {
        this._assertStatus("EXECUTING");
        this._states.next(this.options.id);
        return this.Events.trigger("done", eventInfo);
      }
    };
    var Job_1 = Job;
    var BottleneckError$2, LocalDatastore, parser$2;
    parser$2 = parser;
    BottleneckError$2 = BottleneckError_1;
    LocalDatastore = class LocalDatastore {
      constructor(instance, storeOptions, storeInstanceOptions) {
        this.instance = instance;
        this.storeOptions = storeOptions;
        this.clientId = this.instance._randomIndex();
        parser$2.load(storeInstanceOptions, storeInstanceOptions, this);
        this._nextRequest = this._lastReservoirRefresh = this._lastReservoirIncrease = Date.now();
        this._running = 0;
        this._done = 0;
        this._unblockTime = 0;
        this.ready = this.Promise.resolve();
        this.clients = {};
        this._startHeartbeat();
      }
      _startHeartbeat() {
        var base;
        if (this.heartbeat == null && (this.storeOptions.reservoirRefreshInterval != null && this.storeOptions.reservoirRefreshAmount != null || this.storeOptions.reservoirIncreaseInterval != null && this.storeOptions.reservoirIncreaseAmount != null)) {
          return typeof (base = this.heartbeat = setInterval(() => {
            var amount, incr, maximum, now, reservoir;
            now = Date.now();
            if (this.storeOptions.reservoirRefreshInterval != null && now >= this._lastReservoirRefresh + this.storeOptions.reservoirRefreshInterval) {
              this._lastReservoirRefresh = now;
              this.storeOptions.reservoir = this.storeOptions.reservoirRefreshAmount;
              this.instance._drainAll(this.computeCapacity());
            }
            if (this.storeOptions.reservoirIncreaseInterval != null && now >= this._lastReservoirIncrease + this.storeOptions.reservoirIncreaseInterval) {
              ({
                reservoirIncreaseAmount: amount,
                reservoirIncreaseMaximum: maximum,
                reservoir
              } = this.storeOptions);
              this._lastReservoirIncrease = now;
              incr = maximum != null ? Math.min(amount, maximum - reservoir) : amount;
              if (incr > 0) {
                this.storeOptions.reservoir += incr;
                return this.instance._drainAll(this.computeCapacity());
              }
            }
          }, this.heartbeatInterval)).unref === "function" ? base.unref() : void 0;
        } else {
          return clearInterval(this.heartbeat);
        }
      }
      async __publish__(message) {
        await this.yieldLoop();
        return this.instance.Events.trigger("message", message.toString());
      }
      async __disconnect__(flush) {
        await this.yieldLoop();
        clearInterval(this.heartbeat);
        return this.Promise.resolve();
      }
      yieldLoop(t = 0) {
        return new this.Promise(function(resolve, reject) {
          return setTimeout(resolve, t);
        });
      }
      computePenalty() {
        var ref;
        return (ref = this.storeOptions.penalty) != null ? ref : 15 * this.storeOptions.minTime || 5e3;
      }
      async __updateSettings__(options) {
        await this.yieldLoop();
        parser$2.overwrite(options, options, this.storeOptions);
        this._startHeartbeat();
        this.instance._drainAll(this.computeCapacity());
        return true;
      }
      async __running__() {
        await this.yieldLoop();
        return this._running;
      }
      async __queued__() {
        await this.yieldLoop();
        return this.instance.queued();
      }
      async __done__() {
        await this.yieldLoop();
        return this._done;
      }
      async __groupCheck__(time) {
        await this.yieldLoop();
        return this._nextRequest + this.timeout < time;
      }
      computeCapacity() {
        var maxConcurrent, reservoir;
        ({ maxConcurrent, reservoir } = this.storeOptions);
        if (maxConcurrent != null && reservoir != null) {
          return Math.min(maxConcurrent - this._running, reservoir);
        } else if (maxConcurrent != null) {
          return maxConcurrent - this._running;
        } else if (reservoir != null) {
          return reservoir;
        } else {
          return null;
        }
      }
      conditionsCheck(weight) {
        var capacity;
        capacity = this.computeCapacity();
        return capacity == null || weight <= capacity;
      }
      async __incrementReservoir__(incr) {
        var reservoir;
        await this.yieldLoop();
        reservoir = this.storeOptions.reservoir += incr;
        this.instance._drainAll(this.computeCapacity());
        return reservoir;
      }
      async __currentReservoir__() {
        await this.yieldLoop();
        return this.storeOptions.reservoir;
      }
      isBlocked(now) {
        return this._unblockTime >= now;
      }
      check(weight, now) {
        return this.conditionsCheck(weight) && this._nextRequest - now <= 0;
      }
      async __check__(weight) {
        var now;
        await this.yieldLoop();
        now = Date.now();
        return this.check(weight, now);
      }
      async __register__(index, weight, expiration) {
        var now, wait;
        await this.yieldLoop();
        now = Date.now();
        if (this.conditionsCheck(weight)) {
          this._running += weight;
          if (this.storeOptions.reservoir != null) {
            this.storeOptions.reservoir -= weight;
          }
          wait = Math.max(this._nextRequest - now, 0);
          this._nextRequest = now + wait + this.storeOptions.minTime;
          return {
            success: true,
            wait,
            reservoir: this.storeOptions.reservoir
          };
        } else {
          return {
            success: false
          };
        }
      }
      strategyIsBlock() {
        return this.storeOptions.strategy === 3;
      }
      async __submit__(queueLength, weight) {
        var blocked, now, reachedHWM;
        await this.yieldLoop();
        if (this.storeOptions.maxConcurrent != null && weight > this.storeOptions.maxConcurrent) {
          throw new BottleneckError$2(`Impossible to add a job having a weight of ${weight} to a limiter having a maxConcurrent setting of ${this.storeOptions.maxConcurrent}`);
        }
        now = Date.now();
        reachedHWM = this.storeOptions.highWater != null && queueLength === this.storeOptions.highWater && !this.check(weight, now);
        blocked = this.strategyIsBlock() && (reachedHWM || this.isBlocked(now));
        if (blocked) {
          this._unblockTime = now + this.computePenalty();
          this._nextRequest = this._unblockTime + this.storeOptions.minTime;
          this.instance._dropAllQueued();
        }
        return {
          reachedHWM,
          blocked,
          strategy: this.storeOptions.strategy
        };
      }
      async __free__(index, weight) {
        await this.yieldLoop();
        this._running -= weight;
        this._done += weight;
        this.instance._drainAll(this.computeCapacity());
        return {
          running: this._running
        };
      }
    };
    var LocalDatastore_1 = LocalDatastore;
    var BottleneckError$3, States;
    BottleneckError$3 = BottleneckError_1;
    States = class States {
      constructor(status1) {
        this.status = status1;
        this._jobs = {};
        this.counts = this.status.map(function() {
          return 0;
        });
      }
      next(id) {
        var current, next;
        current = this._jobs[id];
        next = current + 1;
        if (current != null && next < this.status.length) {
          this.counts[current]--;
          this.counts[next]++;
          return this._jobs[id]++;
        } else if (current != null) {
          this.counts[current]--;
          return delete this._jobs[id];
        }
      }
      start(id) {
        var initial;
        initial = 0;
        this._jobs[id] = initial;
        return this.counts[initial]++;
      }
      remove(id) {
        var current;
        current = this._jobs[id];
        if (current != null) {
          this.counts[current]--;
          delete this._jobs[id];
        }
        return current != null;
      }
      jobStatus(id) {
        var ref;
        return (ref = this.status[this._jobs[id]]) != null ? ref : null;
      }
      statusJobs(status) {
        var k, pos, ref, results, v;
        if (status != null) {
          pos = this.status.indexOf(status);
          if (pos < 0) {
            throw new BottleneckError$3(`status must be one of ${this.status.join(", ")}`);
          }
          ref = this._jobs;
          results = [];
          for (k in ref) {
            v = ref[k];
            if (v === pos) {
              results.push(k);
            }
          }
          return results;
        } else {
          return Object.keys(this._jobs);
        }
      }
      statusCounts() {
        return this.counts.reduce((acc, v, i) => {
          acc[this.status[i]] = v;
          return acc;
        }, {});
      }
    };
    var States_1 = States;
    var DLList$2, Sync;
    DLList$2 = DLList_1;
    Sync = class Sync {
      constructor(name, Promise2) {
        this.schedule = this.schedule.bind(this);
        this.name = name;
        this.Promise = Promise2;
        this._running = 0;
        this._queue = new DLList$2();
      }
      isEmpty() {
        return this._queue.length === 0;
      }
      async _tryToRun() {
        var args, cb, error, reject, resolve, returned, task;
        if (this._running < 1 && this._queue.length > 0) {
          this._running++;
          ({ task, args, resolve, reject } = this._queue.shift());
          cb = await async function() {
            try {
              returned = await task(...args);
              return function() {
                return resolve(returned);
              };
            } catch (error1) {
              error = error1;
              return function() {
                return reject(error);
              };
            }
          }();
          this._running--;
          this._tryToRun();
          return cb();
        }
      }
      schedule(task, ...args) {
        var promise, reject, resolve;
        resolve = reject = null;
        promise = new this.Promise(function(_resolve, _reject) {
          resolve = _resolve;
          return reject = _reject;
        });
        this._queue.push({ task, args, resolve, reject });
        this._tryToRun();
        return promise;
      }
    };
    var Sync_1 = Sync;
    var version = "2.19.5";
    var version$1 = {
      version
    };
    var version$2 = /* @__PURE__ */ Object.freeze({
      version,
      default: version$1
    });
    var require$$2 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
    var require$$3 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
    var require$$4 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
    var Events$2, Group, IORedisConnection$1, RedisConnection$1, Scripts$1, parser$3;
    parser$3 = parser;
    Events$2 = Events_1;
    RedisConnection$1 = require$$2;
    IORedisConnection$1 = require$$3;
    Scripts$1 = require$$4;
    Group = (function() {
      class Group2 {
        constructor(limiterOptions = {}) {
          this.deleteKey = this.deleteKey.bind(this);
          this.limiterOptions = limiterOptions;
          parser$3.load(this.limiterOptions, this.defaults, this);
          this.Events = new Events$2(this);
          this.instances = {};
          this.Bottleneck = Bottleneck_1;
          this._startAutoCleanup();
          this.sharedConnection = this.connection != null;
          if (this.connection == null) {
            if (this.limiterOptions.datastore === "redis") {
              this.connection = new RedisConnection$1(Object.assign({}, this.limiterOptions, { Events: this.Events }));
            } else if (this.limiterOptions.datastore === "ioredis") {
              this.connection = new IORedisConnection$1(Object.assign({}, this.limiterOptions, { Events: this.Events }));
            }
          }
        }
        key(key = "") {
          var ref;
          return (ref = this.instances[key]) != null ? ref : (() => {
            var limiter;
            limiter = this.instances[key] = new this.Bottleneck(Object.assign(this.limiterOptions, {
              id: `${this.id}-${key}`,
              timeout: this.timeout,
              connection: this.connection
            }));
            this.Events.trigger("created", limiter, key);
            return limiter;
          })();
        }
        async deleteKey(key = "") {
          var deleted, instance;
          instance = this.instances[key];
          if (this.connection) {
            deleted = await this.connection.__runCommand__(["del", ...Scripts$1.allKeys(`${this.id}-${key}`)]);
          }
          if (instance != null) {
            delete this.instances[key];
            await instance.disconnect();
          }
          return instance != null || deleted > 0;
        }
        limiters() {
          var k, ref, results, v;
          ref = this.instances;
          results = [];
          for (k in ref) {
            v = ref[k];
            results.push({
              key: k,
              limiter: v
            });
          }
          return results;
        }
        keys() {
          return Object.keys(this.instances);
        }
        async clusterKeys() {
          var cursor, end, found, i, k, keys, len, next, start;
          if (this.connection == null) {
            return this.Promise.resolve(this.keys());
          }
          keys = [];
          cursor = null;
          start = `b_${this.id}-`.length;
          end = "_settings".length;
          while (cursor !== 0) {
            [next, found] = await this.connection.__runCommand__(["scan", cursor != null ? cursor : 0, "match", `b_${this.id}-*_settings`, "count", 1e4]);
            cursor = ~~next;
            for (i = 0, len = found.length; i < len; i++) {
              k = found[i];
              keys.push(k.slice(start, -end));
            }
          }
          return keys;
        }
        _startAutoCleanup() {
          var base;
          clearInterval(this.interval);
          return typeof (base = this.interval = setInterval(async () => {
            var e, k, ref, results, time, v;
            time = Date.now();
            ref = this.instances;
            results = [];
            for (k in ref) {
              v = ref[k];
              try {
                if (await v._store.__groupCheck__(time)) {
                  results.push(this.deleteKey(k));
                } else {
                  results.push(void 0);
                }
              } catch (error) {
                e = error;
                results.push(v.Events.trigger("error", e));
              }
            }
            return results;
          }, this.timeout / 2)).unref === "function" ? base.unref() : void 0;
        }
        updateSettings(options = {}) {
          parser$3.overwrite(options, this.defaults, this);
          parser$3.overwrite(options, options, this.limiterOptions);
          if (options.timeout != null) {
            return this._startAutoCleanup();
          }
        }
        disconnect(flush = true) {
          var ref;
          if (!this.sharedConnection) {
            return (ref = this.connection) != null ? ref.disconnect(flush) : void 0;
          }
        }
      }
      Group2.prototype.defaults = {
        timeout: 1e3 * 60 * 5,
        connection: null,
        Promise,
        id: "group-key"
      };
      return Group2;
    }).call(commonjsGlobal$1);
    var Group_1 = Group;
    var Batcher, Events$3, parser$4;
    parser$4 = parser;
    Events$3 = Events_1;
    Batcher = (function() {
      class Batcher2 {
        constructor(options = {}) {
          this.options = options;
          parser$4.load(this.options, this.defaults, this);
          this.Events = new Events$3(this);
          this._arr = [];
          this._resetPromise();
          this._lastFlush = Date.now();
        }
        _resetPromise() {
          return this._promise = new this.Promise((res, rej) => {
            return this._resolve = res;
          });
        }
        _flush() {
          clearTimeout(this._timeout);
          this._lastFlush = Date.now();
          this._resolve();
          this.Events.trigger("batch", this._arr);
          this._arr = [];
          return this._resetPromise();
        }
        add(data) {
          var ret;
          this._arr.push(data);
          ret = this._promise;
          if (this._arr.length === this.maxSize) {
            this._flush();
          } else if (this.maxTime != null && this._arr.length === 1) {
            this._timeout = setTimeout(() => {
              return this._flush();
            }, this.maxTime);
          }
          return ret;
        }
      }
      Batcher2.prototype.defaults = {
        maxTime: null,
        maxSize: null,
        Promise
      };
      return Batcher2;
    }).call(commonjsGlobal$1);
    var Batcher_1 = Batcher;
    var require$$4$1 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
    var require$$8 = getCjsExportFromNamespace(version$2);
    var Bottleneck, DEFAULT_PRIORITY$1, Events$4, Job$1, LocalDatastore$1, NUM_PRIORITIES$1, Queues$1, RedisDatastore$1, States$1, Sync$1, parser$5, splice = [].splice;
    NUM_PRIORITIES$1 = 10;
    DEFAULT_PRIORITY$1 = 5;
    parser$5 = parser;
    Queues$1 = Queues_1;
    Job$1 = Job_1;
    LocalDatastore$1 = LocalDatastore_1;
    RedisDatastore$1 = require$$4$1;
    Events$4 = Events_1;
    States$1 = States_1;
    Sync$1 = Sync_1;
    Bottleneck = (function() {
      class Bottleneck2 {
        constructor(options = {}, ...invalid) {
          var storeInstanceOptions, storeOptions;
          this._addToQueue = this._addToQueue.bind(this);
          this._validateOptions(options, invalid);
          parser$5.load(options, this.instanceDefaults, this);
          this._queues = new Queues$1(NUM_PRIORITIES$1);
          this._scheduled = {};
          this._states = new States$1(["RECEIVED", "QUEUED", "RUNNING", "EXECUTING"].concat(this.trackDoneStatus ? ["DONE"] : []));
          this._limiter = null;
          this.Events = new Events$4(this);
          this._submitLock = new Sync$1("submit", this.Promise);
          this._registerLock = new Sync$1("register", this.Promise);
          storeOptions = parser$5.load(options, this.storeDefaults, {});
          this._store = (function() {
            if (this.datastore === "redis" || this.datastore === "ioredis" || this.connection != null) {
              storeInstanceOptions = parser$5.load(options, this.redisStoreDefaults, {});
              return new RedisDatastore$1(this, storeOptions, storeInstanceOptions);
            } else if (this.datastore === "local") {
              storeInstanceOptions = parser$5.load(options, this.localStoreDefaults, {});
              return new LocalDatastore$1(this, storeOptions, storeInstanceOptions);
            } else {
              throw new Bottleneck2.prototype.BottleneckError(`Invalid datastore type: ${this.datastore}`);
            }
          }).call(this);
          this._queues.on("leftzero", () => {
            var ref;
            return (ref = this._store.heartbeat) != null ? typeof ref.ref === "function" ? ref.ref() : void 0 : void 0;
          });
          this._queues.on("zero", () => {
            var ref;
            return (ref = this._store.heartbeat) != null ? typeof ref.unref === "function" ? ref.unref() : void 0 : void 0;
          });
        }
        _validateOptions(options, invalid) {
          if (!(options != null && typeof options === "object" && invalid.length === 0)) {
            throw new Bottleneck2.prototype.BottleneckError("Bottleneck v2 takes a single object argument. Refer to https://github.com/SGrondin/bottleneck#upgrading-to-v2 if you're upgrading from Bottleneck v1.");
          }
        }
        ready() {
          return this._store.ready;
        }
        clients() {
          return this._store.clients;
        }
        channel() {
          return `b_${this.id}`;
        }
        channel_client() {
          return `b_${this.id}_${this._store.clientId}`;
        }
        publish(message) {
          return this._store.__publish__(message);
        }
        disconnect(flush = true) {
          return this._store.__disconnect__(flush);
        }
        chain(_limiter) {
          this._limiter = _limiter;
          return this;
        }
        queued(priority) {
          return this._queues.queued(priority);
        }
        clusterQueued() {
          return this._store.__queued__();
        }
        empty() {
          return this.queued() === 0 && this._submitLock.isEmpty();
        }
        running() {
          return this._store.__running__();
        }
        done() {
          return this._store.__done__();
        }
        jobStatus(id) {
          return this._states.jobStatus(id);
        }
        jobs(status) {
          return this._states.statusJobs(status);
        }
        counts() {
          return this._states.statusCounts();
        }
        _randomIndex() {
          return Math.random().toString(36).slice(2);
        }
        check(weight = 1) {
          return this._store.__check__(weight);
        }
        _clearGlobalState(index) {
          if (this._scheduled[index] != null) {
            clearTimeout(this._scheduled[index].expiration);
            delete this._scheduled[index];
            return true;
          } else {
            return false;
          }
        }
        async _free(index, job, options, eventInfo) {
          var e, running;
          try {
            ({ running } = await this._store.__free__(index, options.weight));
            this.Events.trigger("debug", `Freed ${options.id}`, eventInfo);
            if (running === 0 && this.empty()) {
              return this.Events.trigger("idle");
            }
          } catch (error1) {
            e = error1;
            return this.Events.trigger("error", e);
          }
        }
        _run(index, job, wait) {
          var clearGlobalState, free, run;
          job.doRun();
          clearGlobalState = this._clearGlobalState.bind(this, index);
          run = this._run.bind(this, index, job);
          free = this._free.bind(this, index, job);
          return this._scheduled[index] = {
            timeout: setTimeout(() => {
              return job.doExecute(this._limiter, clearGlobalState, run, free);
            }, wait),
            expiration: job.options.expiration != null ? setTimeout(function() {
              return job.doExpire(clearGlobalState, run, free);
            }, wait + job.options.expiration) : void 0,
            job
          };
        }
        _drainOne(capacity) {
          return this._registerLock.schedule(() => {
            var args, index, next, options, queue;
            if (this.queued() === 0) {
              return this.Promise.resolve(null);
            }
            queue = this._queues.getFirst();
            ({ options, args } = next = queue.first());
            if (capacity != null && options.weight > capacity) {
              return this.Promise.resolve(null);
            }
            this.Events.trigger("debug", `Draining ${options.id}`, { args, options });
            index = this._randomIndex();
            return this._store.__register__(index, options.weight, options.expiration).then(({ success, wait, reservoir }) => {
              var empty;
              this.Events.trigger("debug", `Drained ${options.id}`, { success, args, options });
              if (success) {
                queue.shift();
                empty = this.empty();
                if (empty) {
                  this.Events.trigger("empty");
                }
                if (reservoir === 0) {
                  this.Events.trigger("depleted", empty);
                }
                this._run(index, next, wait);
                return this.Promise.resolve(options.weight);
              } else {
                return this.Promise.resolve(null);
              }
            });
          });
        }
        _drainAll(capacity, total = 0) {
          return this._drainOne(capacity).then((drained) => {
            var newCapacity;
            if (drained != null) {
              newCapacity = capacity != null ? capacity - drained : capacity;
              return this._drainAll(newCapacity, total + drained);
            } else {
              return this.Promise.resolve(total);
            }
          }).catch((e) => {
            return this.Events.trigger("error", e);
          });
        }
        _dropAllQueued(message) {
          return this._queues.shiftAll(function(job) {
            return job.doDrop({ message });
          });
        }
        stop(options = {}) {
          var done, waitForExecuting;
          options = parser$5.load(options, this.stopDefaults);
          waitForExecuting = (at) => {
            var finished;
            finished = () => {
              var counts;
              counts = this._states.counts;
              return counts[0] + counts[1] + counts[2] + counts[3] === at;
            };
            return new this.Promise((resolve, reject) => {
              if (finished()) {
                return resolve();
              } else {
                return this.on("done", () => {
                  if (finished()) {
                    this.removeAllListeners("done");
                    return resolve();
                  }
                });
              }
            });
          };
          done = options.dropWaitingJobs ? (this._run = function(index, next) {
            return next.doDrop({
              message: options.dropErrorMessage
            });
          }, this._drainOne = () => {
            return this.Promise.resolve(null);
          }, this._registerLock.schedule(() => {
            return this._submitLock.schedule(() => {
              var k, ref, v;
              ref = this._scheduled;
              for (k in ref) {
                v = ref[k];
                if (this.jobStatus(v.job.options.id) === "RUNNING") {
                  clearTimeout(v.timeout);
                  clearTimeout(v.expiration);
                  v.job.doDrop({
                    message: options.dropErrorMessage
                  });
                }
              }
              this._dropAllQueued(options.dropErrorMessage);
              return waitForExecuting(0);
            });
          })) : this.schedule({
            priority: NUM_PRIORITIES$1 - 1,
            weight: 0
          }, () => {
            return waitForExecuting(1);
          });
          this._receive = function(job) {
            return job._reject(new Bottleneck2.prototype.BottleneckError(options.enqueueErrorMessage));
          };
          this.stop = () => {
            return this.Promise.reject(new Bottleneck2.prototype.BottleneckError("stop() has already been called"));
          };
          return done;
        }
        async _addToQueue(job) {
          var args, blocked, error, options, reachedHWM, shifted, strategy;
          ({ args, options } = job);
          try {
            ({ reachedHWM, blocked, strategy } = await this._store.__submit__(this.queued(), options.weight));
          } catch (error1) {
            error = error1;
            this.Events.trigger("debug", `Could not queue ${options.id}`, { args, options, error });
            job.doDrop({ error });
            return false;
          }
          if (blocked) {
            job.doDrop();
            return true;
          } else if (reachedHWM) {
            shifted = strategy === Bottleneck2.prototype.strategy.LEAK ? this._queues.shiftLastFrom(options.priority) : strategy === Bottleneck2.prototype.strategy.OVERFLOW_PRIORITY ? this._queues.shiftLastFrom(options.priority + 1) : strategy === Bottleneck2.prototype.strategy.OVERFLOW ? job : void 0;
            if (shifted != null) {
              shifted.doDrop();
            }
            if (shifted == null || strategy === Bottleneck2.prototype.strategy.OVERFLOW) {
              if (shifted == null) {
                job.doDrop();
              }
              return reachedHWM;
            }
          }
          job.doQueue(reachedHWM, blocked);
          this._queues.push(job);
          await this._drainAll();
          return reachedHWM;
        }
        _receive(job) {
          if (this._states.jobStatus(job.options.id) != null) {
            job._reject(new Bottleneck2.prototype.BottleneckError(`A job with the same id already exists (id=${job.options.id})`));
            return false;
          } else {
            job.doReceive();
            return this._submitLock.schedule(this._addToQueue, job);
          }
        }
        submit(...args) {
          var cb, fn, job, options, ref, ref1, task;
          if (typeof args[0] === "function") {
            ref = args, [fn, ...args] = ref, [cb] = splice.call(args, -1);
            options = parser$5.load({}, this.jobDefaults);
          } else {
            ref1 = args, [options, fn, ...args] = ref1, [cb] = splice.call(args, -1);
            options = parser$5.load(options, this.jobDefaults);
          }
          task = (...args2) => {
            return new this.Promise(function(resolve, reject) {
              return fn(...args2, function(...args3) {
                return (args3[0] != null ? reject : resolve)(args3);
              });
            });
          };
          job = new Job$1(task, args, options, this.jobDefaults, this.rejectOnDrop, this.Events, this._states, this.Promise);
          job.promise.then(function(args2) {
            return typeof cb === "function" ? cb(...args2) : void 0;
          }).catch(function(args2) {
            if (Array.isArray(args2)) {
              return typeof cb === "function" ? cb(...args2) : void 0;
            } else {
              return typeof cb === "function" ? cb(args2) : void 0;
            }
          });
          return this._receive(job);
        }
        schedule(...args) {
          var job, options, task;
          if (typeof args[0] === "function") {
            [task, ...args] = args;
            options = {};
          } else {
            [options, task, ...args] = args;
          }
          job = new Job$1(task, args, options, this.jobDefaults, this.rejectOnDrop, this.Events, this._states, this.Promise);
          this._receive(job);
          return job.promise;
        }
        wrap(fn) {
          var schedule, wrapped;
          schedule = this.schedule.bind(this);
          wrapped = function(...args) {
            return schedule(fn.bind(this), ...args);
          };
          wrapped.withOptions = function(options, ...args) {
            return schedule(options, fn, ...args);
          };
          return wrapped;
        }
        async updateSettings(options = {}) {
          await this._store.__updateSettings__(parser$5.overwrite(options, this.storeDefaults));
          parser$5.overwrite(options, this.instanceDefaults, this);
          return this;
        }
        currentReservoir() {
          return this._store.__currentReservoir__();
        }
        incrementReservoir(incr = 0) {
          return this._store.__incrementReservoir__(incr);
        }
      }
      Bottleneck2.default = Bottleneck2;
      Bottleneck2.Events = Events$4;
      Bottleneck2.version = Bottleneck2.prototype.version = require$$8.version;
      Bottleneck2.strategy = Bottleneck2.prototype.strategy = {
        LEAK: 1,
        OVERFLOW: 2,
        OVERFLOW_PRIORITY: 4,
        BLOCK: 3
      };
      Bottleneck2.BottleneckError = Bottleneck2.prototype.BottleneckError = BottleneckError_1;
      Bottleneck2.Group = Bottleneck2.prototype.Group = Group_1;
      Bottleneck2.RedisConnection = Bottleneck2.prototype.RedisConnection = require$$2;
      Bottleneck2.IORedisConnection = Bottleneck2.prototype.IORedisConnection = require$$3;
      Bottleneck2.Batcher = Bottleneck2.prototype.Batcher = Batcher_1;
      Bottleneck2.prototype.jobDefaults = {
        priority: DEFAULT_PRIORITY$1,
        weight: 1,
        expiration: null,
        id: "<no-id>"
      };
      Bottleneck2.prototype.storeDefaults = {
        maxConcurrent: null,
        minTime: 0,
        highWater: null,
        strategy: Bottleneck2.prototype.strategy.LEAK,
        penalty: null,
        reservoir: null,
        reservoirRefreshInterval: null,
        reservoirRefreshAmount: null,
        reservoirIncreaseInterval: null,
        reservoirIncreaseAmount: null,
        reservoirIncreaseMaximum: null
      };
      Bottleneck2.prototype.localStoreDefaults = {
        Promise,
        timeout: null,
        heartbeatInterval: 250
      };
      Bottleneck2.prototype.redisStoreDefaults = {
        Promise,
        timeout: null,
        heartbeatInterval: 5e3,
        clientTimeout: 1e4,
        Redis: null,
        clientOptions: {},
        clusterNodes: null,
        clearDatastore: false,
        connection: null
      };
      Bottleneck2.prototype.instanceDefaults = {
        datastore: "local",
        connection: null,
        id: "<no-id>",
        rejectOnDrop: true,
        trackDoneStatus: false,
        Promise
      };
      Bottleneck2.prototype.stopDefaults = {
        enqueueErrorMessage: "This limiter has been stopped and cannot accept new jobs.",
        dropWaitingJobs: true,
        dropErrorMessage: "This limiter has been stopped."
      };
      return Bottleneck2;
    }).call(commonjsGlobal$1);
    var Bottleneck_1 = Bottleneck;
    var lib = Bottleneck_1;
    return lib;
  });
})(light);
var lightExports = light.exports;
const BottleneckLight = /* @__PURE__ */ getDefaultExportFromCjs(lightExports);
var VERSION$2 = "0.0.0-development";
async function errorRequest(state, octokit, error, options) {
  if (!error.request || !error.request.request) {
    throw error;
  }
  if (error.status >= 400 && !state.doNotRetry.includes(error.status)) {
    const retries = options.request.retries != null ? options.request.retries : state.retries;
    const retryAfter = Math.pow((options.request.retryCount || 0) + 1, 2);
    throw octokit.retry.retryRequest(error, retries, retryAfter);
  }
  throw error;
}
async function wrapRequest$1(state, octokit, request2, options) {
  const limiter = new BottleneckLight();
  limiter.on("failed", function(error, info) {
    const maxRetries = ~~error.request.request.retries;
    const after = ~~error.request.request.retryAfter;
    options.request.retryCount = info.retryCount + 1;
    if (maxRetries > info.retryCount) {
      return after * state.retryAfterBaseValue;
    }
  });
  return limiter.schedule(
    requestWithGraphqlErrorHandling.bind(null, state, octokit, request2),
    options
  );
}
async function requestWithGraphqlErrorHandling(state, octokit, request2, options) {
  const response = await request2(request2, options);
  if (response.data && response.data.errors && response.data.errors.length > 0 && /Something went wrong while executing your query/.test(
    response.data.errors[0].message
  )) {
    const error = new RequestError(response.data.errors[0].message, 500, {
      request: options,
      response
    });
    return errorRequest(state, octokit, error, options);
  }
  return response;
}
function retry(octokit, octokitOptions) {
  const state = Object.assign(
    {
      enabled: true,
      retryAfterBaseValue: 1e3,
      doNotRetry: [400, 401, 403, 404, 410, 422, 451],
      retries: 3
    },
    octokitOptions.retry
  );
  if (state.enabled) {
    octokit.hook.error("request", errorRequest.bind(null, state, octokit));
    octokit.hook.wrap("request", wrapRequest$1.bind(null, state, octokit));
  }
  return {
    retry: {
      retryRequest: (error, retries, retryAfter) => {
        error.request.request = Object.assign({}, error.request.request, {
          retries,
          retryAfter
        });
        return error;
      }
    }
  };
}
retry.VERSION = VERSION$2;
var VERSION$1 = "0.0.0-development";
var noop = () => Promise.resolve();
function wrapRequest(state, request2, options) {
  return state.retryLimiter.schedule(doRequest, state, request2, options);
}
async function doRequest(state, request2, options) {
  const { pathname } = new URL(options.url, "http://github.test");
  const isAuth = isAuthRequest(options.method, pathname);
  const isWrite = !isAuth && options.method !== "GET" && options.method !== "HEAD";
  const isSearch = options.method === "GET" && pathname.startsWith("/search/");
  const isGraphQL = pathname.startsWith("/graphql");
  const retryCount = ~~request2.retryCount;
  const jobOptions = retryCount > 0 ? { priority: 0, weight: 0 } : {};
  if (state.clustering) {
    jobOptions.expiration = 1e3 * 60;
  }
  if (isWrite || isGraphQL) {
    await state.write.key(state.id).schedule(jobOptions, noop);
  }
  if (isWrite && state.triggersNotification(pathname)) {
    await state.notifications.key(state.id).schedule(jobOptions, noop);
  }
  if (isSearch) {
    await state.search.key(state.id).schedule(jobOptions, noop);
  }
  const req = (isAuth ? state.auth : state.global).key(state.id).schedule(jobOptions, request2, options);
  if (isGraphQL) {
    const res = await req;
    if (res.data.errors != null && res.data.errors.some((error) => error.type === "RATE_LIMITED")) {
      const error = Object.assign(new Error("GraphQL Rate Limit Exceeded"), {
        response: res,
        data: res.data
      });
      throw error;
    }
  }
  return req;
}
function isAuthRequest(method, pathname) {
  return method === "PATCH" && // https://docs.github.com/en/rest/apps/apps?apiVersion=2022-11-28#create-a-scoped-access-token
  /^\/applications\/[^/]+\/token\/scoped$/.test(pathname) || method === "POST" && // https://docs.github.com/en/rest/apps/oauth-applications?apiVersion=2022-11-28#reset-a-token
  (/^\/applications\/[^/]+\/token$/.test(pathname) || // https://docs.github.com/en/rest/apps/apps?apiVersion=2022-11-28#create-an-installation-access-token-for-an-app
  /^\/app\/installations\/[^/]+\/access_tokens$/.test(pathname) || // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
  pathname === "/login/oauth/access_token");
}
var triggers_notification_paths_default = [
  "/orgs/{org}/invitations",
  "/orgs/{org}/invitations/{invitation_id}",
  "/orgs/{org}/teams/{team_slug}/discussions",
  "/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments",
  "/repos/{owner}/{repo}/collaborators/{username}",
  "/repos/{owner}/{repo}/commits/{commit_sha}/comments",
  "/repos/{owner}/{repo}/issues",
  "/repos/{owner}/{repo}/issues/{issue_number}/comments",
  "/repos/{owner}/{repo}/issues/{issue_number}/sub_issue",
  "/repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority",
  "/repos/{owner}/{repo}/pulls",
  "/repos/{owner}/{repo}/pulls/{pull_number}/comments",
  "/repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies",
  "/repos/{owner}/{repo}/pulls/{pull_number}/merge",
  "/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
  "/repos/{owner}/{repo}/pulls/{pull_number}/reviews",
  "/repos/{owner}/{repo}/releases",
  "/teams/{team_id}/discussions",
  "/teams/{team_id}/discussions/{discussion_number}/comments"
];
function routeMatcher(paths) {
  const regexes = paths.map(
    (path) => path.split("/").map((c) => c.startsWith("{") ? "(?:.+?)" : c).join("/")
  );
  const regex2 = `^(?:${regexes.map((r) => `(?:${r})`).join("|")})[^/]*$`;
  return new RegExp(regex2, "i");
}
var regex = routeMatcher(triggers_notification_paths_default);
var triggersNotification = regex.test.bind(regex);
var groups = {};
var createGroups = function(Bottleneck, common) {
  groups.global = new Bottleneck.Group({
    id: "octokit-global",
    maxConcurrent: 10,
    ...common
  });
  groups.auth = new Bottleneck.Group({
    id: "octokit-auth",
    maxConcurrent: 1,
    ...common
  });
  groups.search = new Bottleneck.Group({
    id: "octokit-search",
    maxConcurrent: 1,
    minTime: 2e3,
    ...common
  });
  groups.write = new Bottleneck.Group({
    id: "octokit-write",
    maxConcurrent: 1,
    minTime: 1e3,
    ...common
  });
  groups.notifications = new Bottleneck.Group({
    id: "octokit-notifications",
    maxConcurrent: 1,
    minTime: 3e3,
    ...common
  });
};
function throttling(octokit, octokitOptions) {
  const {
    enabled = true,
    Bottleneck = BottleneckLight,
    id = "no-id",
    timeout = 1e3 * 60 * 2,
    // Redis TTL: 2 minutes
    connection
  } = octokitOptions.throttle || {};
  if (!enabled) {
    return {};
  }
  const common = { timeout };
  if (typeof connection !== "undefined") {
    common.connection = connection;
  }
  if (groups.global == null) {
    createGroups(Bottleneck, common);
  }
  const state = Object.assign(
    {
      clustering: connection != null,
      triggersNotification,
      fallbackSecondaryRateRetryAfter: 60,
      retryAfterBaseValue: 1e3,
      retryLimiter: new Bottleneck(),
      id,
      ...groups
    },
    octokitOptions.throttle
  );
  if (typeof state.onSecondaryRateLimit !== "function" || typeof state.onRateLimit !== "function") {
    throw new Error(`octokit/plugin-throttling error:
        You must pass the onSecondaryRateLimit and onRateLimit error handlers.
        See https://octokit.github.io/rest.js/#throttling

        const octokit = new Octokit({
          throttle: {
            onSecondaryRateLimit: (retryAfter, options) => {/* ... */},
            onRateLimit: (retryAfter, options) => {/* ... */}
          }
        })
    `);
  }
  const events = {};
  const emitter = new Bottleneck.Events(events);
  events.on("secondary-limit", state.onSecondaryRateLimit);
  events.on("rate-limit", state.onRateLimit);
  events.on(
    "error",
    (e) => octokit.log.warn("Error in throttling-plugin limit handler", e)
  );
  state.retryLimiter.on("failed", async function(error, info) {
    const [state2, request2, options] = info.args;
    const { pathname } = new URL(options.url, "http://github.test");
    const shouldRetryGraphQL = pathname.startsWith("/graphql") && error.status !== 401;
    if (!(shouldRetryGraphQL || error.status === 403 || error.status === 429)) {
      return;
    }
    const retryCount = ~~request2.retryCount;
    request2.retryCount = retryCount;
    options.request.retryCount = retryCount;
    const { wantRetry, retryAfter = 0 } = await async function() {
      var _a2;
      if (/\bsecondary rate\b/i.test(error.message)) {
        const retryAfter2 = Number(error.response.headers["retry-after"]) || state2.fallbackSecondaryRateRetryAfter;
        const wantRetry2 = await emitter.trigger(
          "secondary-limit",
          retryAfter2,
          options,
          octokit,
          retryCount
        );
        return { wantRetry: wantRetry2, retryAfter: retryAfter2 };
      }
      if (error.response.headers != null && error.response.headers["x-ratelimit-remaining"] === "0" || (((_a2 = error.response.data) == null ? void 0 : _a2.errors) ?? []).some(
        (error2) => error2.type === "RATE_LIMITED"
      )) {
        const rateLimitReset = new Date(
          ~~error.response.headers["x-ratelimit-reset"] * 1e3
        ).getTime();
        const retryAfter2 = Math.max(
          // Add one second so we retry _after_ the reset time
          // https://docs.github.com/en/rest/overview/resources-in-the-rest-api?apiVersion=2022-11-28#exceeding-the-rate-limit
          Math.ceil((rateLimitReset - Date.now()) / 1e3) + 1,
          0
        );
        const wantRetry2 = await emitter.trigger(
          "rate-limit",
          retryAfter2,
          options,
          octokit,
          retryCount
        );
        return { wantRetry: wantRetry2, retryAfter: retryAfter2 };
      }
      return {};
    }();
    if (wantRetry) {
      request2.retryCount++;
      return retryAfter * state2.retryAfterBaseValue;
    }
  });
  octokit.hook.wrap("request", wrapRequest.bind(null, state));
  return {};
}
throttling.VERSION = VERSION$1;
throttling.triggersNotification = triggersNotification;
var VERSION = "0.0.0-development";
var Octokit = Octokit$1.plugin(
  restEndpointMethods,
  paginateRest,
  paginateGraphQL,
  retry,
  throttling
).defaults({
  userAgent: `octokit.js/${VERSION}`,
  throttle: {
    onRateLimit,
    onSecondaryRateLimit
  }
});
function onRateLimit(retryAfter, options, octokit) {
  octokit.log.warn(
    `Request quota exhausted for request ${options.method} ${options.url}`
  );
  if (options.request.retryCount === 0) {
    octokit.log.info(`Retrying after ${retryAfter} seconds!`);
    return true;
  }
}
function onSecondaryRateLimit(retryAfter, options, octokit) {
  octokit.log.warn(
    `SecondaryRateLimit detected for request ${options.method} ${options.url}`
  );
  if (options.request.retryCount === 0) {
    octokit.log.info(`Retrying after ${retryAfter} seconds!`);
    return true;
  }
}
class GitHubClient {
  constructor(settings) {
    if (!settings.githubToken) {
      throw new Error("GitHub token is required");
    }
    this.settings = settings;
    this.octokit = new Octokit({ auth: settings.githubToken });
  }
  get owner() {
    return this.settings.repoOwner;
  }
  get repo() {
    return this.settings.repoName;
  }
  get branch() {
    return this.settings.branch;
  }
  /**
   * Helper for raw Octokit requests if needed
   */
  async request(route, options) {
    return await this.octokit.request(route, {
      owner: this.owner,
      repo: this.repo,
      ...options
    });
  }
  async getRepoDetails() {
    const response = await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.repo
    });
    return response.data;
  }
}
class ContentManager extends GitHubClient {
  async getFileContent(path) {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch
      });
      const data = response.data;
      if (data.type === "file" && "content" in data) {
        return {
          content: Buffer.from(data.content, "base64").toString("utf-8"),
          sha: data.sha
        };
      }
      return null;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }
  async uploadFile(path, content, message) {
    const existing = await this.getFileContent(path);
    const sha = existing ? existing.sha : void 0;
    const base64Content = Buffer.from(content).toString("base64");
    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: base64Content,
      sha,
      branch: this.branch
    });
  }
  async deleteFileByPath(path) {
    const file = await this.getFileContent(path);
    if (!file) throw new Error("File not found on GitHub");
    await this.octokit.rest.repos.deleteFile({
      owner: this.owner,
      repo: this.repo,
      path,
      message: `chore: delete ${path} via Obsidian`,
      sha: file.sha,
      branch: this.branch
    });
  }
  async createBatchCommit(files, message) {
    if (files.length === 0) return;
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    while (attempts < MAX_ATTEMPTS) {
      try {
        const { currentCommitSha, baseTreeSha } = await this.getLatestCommitInfo();
        const treeItems = await this.buildTreeItems(files);
        await this.pushNewCommit(treeItems, baseTreeSha, currentCommitSha, message);
        return;
      } catch (error) {
        if (error.status === 422 && attempts < MAX_ATTEMPTS - 1) {
          attempts++;
          await new Promise((r) => setTimeout(r, 2e3));
          continue;
        }
        throw error;
      }
    }
  }
  async getLatestCommitInfo() {
    const { data: refData } = await this.octokit.rest.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${this.branch}`
    });
    const currentCommitSha = refData.object.sha;
    const { data: commitData } = await this.octokit.rest.git.getCommit({
      owner: this.owner,
      repo: this.repo,
      commit_sha: currentCommitSha
    });
    return { currentCommitSha, baseTreeSha: commitData.tree.sha };
  }
  async buildTreeItems(files) {
    return Promise.all(files.map(async (file) => {
      if (file.isDeleted) {
        return { path: file.path, mode: "100644", type: "blob", sha: null };
      }
      const { data: blobData } = await this.octokit.rest.git.createBlob({
        owner: this.owner,
        repo: this.repo,
        content: file.isBinary ? Buffer.from(file.content).toString("base64") : file.content,
        encoding: file.isBinary ? "base64" : "utf-8"
      });
      return {
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blobData.sha
      };
    }));
  }
  async pushNewCommit(treeItems, baseTreeSha, parentSha, message) {
    const { data: newTree } = await this.octokit.rest.git.createTree({
      owner: this.owner,
      repo: this.repo,
      base_tree: baseTreeSha,
      tree: treeItems
    });
    const { data: newCommit } = await this.octokit.rest.git.createCommit({
      owner: this.owner,
      repo: this.repo,
      message,
      tree: newTree.sha,
      parents: [parentSha]
    });
    await this.octokit.rest.git.updateRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${this.branch}`,
      sha: newCommit.sha
    });
  }
  async getUploadedNotes() {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: "notes",
        ref: this.branch
      });
      if (Array.isArray(response.data)) {
        return response.data.filter((item) => item.type === "file" && item.name.endsWith(".md")).map((item) => ({
          name: item.name,
          path: item.path,
          sha: item.sha
        }));
      }
      return [];
    } catch (error) {
      if (error.status === 404) return [];
      throw error;
    }
  }
}
class TemplateUpdater extends GitHubClient {
  async getUpstreamStatus() {
    var _a2, _b;
    const repoInfo = await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.repo
    });
    const upstreamOwner = ((_a2 = repoInfo.data.parent) == null ? void 0 : _a2.owner.login) || "wis-graph";
    const upstreamBranch = ((_b = repoInfo.data.parent) == null ? void 0 : _b.default_branch) || "main";
    const basehead = `${upstreamOwner}:${upstreamBranch}...${this.branch}`;
    try {
      const response = await this.octokit.request("GET /repos/{owner}/{repo}/compare/{basehead}", {
        owner: this.owner,
        repo: this.repo,
        basehead
      });
      return {
        status: response.data.status,
        behind_by: response.data.behind_by
      };
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Upstream comparison failed for ${basehead}. Ensure repo is a fork.`);
      }
      throw error;
    }
  }
  async mergeUpstream() {
    try {
      await this.octokit.rest.repos.mergeUpstream({
        owner: this.owner,
        repo: this.repo,
        branch: this.branch
      });
    } catch (error) {
      if (error.status === 409) {
        throw new Error('Conflict detected. Manual "Force Update" is required.');
      }
      throw error;
    }
  }
  async forceUpdate() {
    const repoInfo = await this.octokit.rest.repos.get({ owner: this.owner, repo: this.repo });
    if (!repoInfo.data.fork || !repoInfo.data.parent) throw new Error("Not a fork repository.");
    const uOwner = repoInfo.data.parent.owner.login;
    const uRepo = repoInfo.data.parent.name;
    const uBranch = repoInfo.data.parent.default_branch || "main";
    const uRef = await this.octokit.rest.git.getRef({ owner: uOwner, repo: uRepo, ref: `heads/${uBranch}` });
    const currentRef = await this.octokit.rest.git.getRef({ owner: this.owner, repo: this.repo, ref: `heads/${this.branch}` });
    const uSha = uRef.data.object.sha;
    const cSha = currentRef.data.object.sha;
    const uTree = await this.octokit.rest.git.getTree({ owner: uOwner, repo: uRepo, tree_sha: uSha, recursive: "true" });
    const cTree = await this.octokit.rest.git.getTree({ owner: this.owner, repo: this.repo, tree_sha: cSha, recursive: "true" });
    const isProtected = (p) => p.startsWith("notes/") || p.startsWith("images/") || ["_home.md", "_sidebar.md", "favicon.ico", "CNAME", "css/custom.css"].includes(p);
    const treeItems = uTree.data.tree.filter((item) => item.type === "blob" && !isProtected(item.path)).map((item) => ({ path: item.path, mode: item.mode, type: item.type, sha: item.sha }));
    const uPaths = new Set(uTree.data.tree.map((i) => i.path));
    cTree.data.tree.filter((i) => i.type === "blob" && !isProtected(i.path) && !uPaths.has(i.path)).forEach((i) => treeItems.push({ path: i.path, mode: i.mode, type: i.type, sha: null }));
    if (treeItems.length === 0) return;
    const newTree = await this.octokit.rest.git.createTree({
      owner: this.owner,
      repo: this.repo,
      base_tree: cSha,
      tree: treeItems
    });
    const newCommit = await this.octokit.rest.git.createCommit({
      owner: this.owner,
      repo: this.repo,
      message: "chore: force update core files (atomic)",
      tree: newTree.data.sha,
      parents: [cSha, uSha]
    });
    await this.octokit.rest.git.updateRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${this.branch}`,
      sha: newCommit.data.sha,
      force: true
    });
  }
  async getUpstreamInfo() {
    var _a2, _b, _c;
    const repoData = await this.getRepoDetails();
    return {
      owner: ((_a2 = repoData.parent) == null ? void 0 : _a2.owner.login) || "wis-graph",
      repo: ((_b = repoData.parent) == null ? void 0 : _b.name) || "sharepage",
      branch: ((_c = repoData.parent) == null ? void 0 : _c.default_branch) || "main"
    };
  }
  isVersionOlder(current, latest) {
    const c = current.replace(/^v/, "").split(".").map(Number);
    const l = latest.replace(/^v/, "").split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((l[i] || 0) > (c[i] || 0)) return true;
      if ((l[i] || 0) < (c[i] || 0)) return false;
    }
    return false;
  }
  async getTemplateVersion(owner, repo, branch) {
    try {
      const refRes = await this.octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
      const res = await this.octokit.rest.repos.getContent({ owner, repo, path: "package.json", ref: refRes.data.object.sha });
      const data = res.data;
      if (data.content) {
        const pkg = JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
        return pkg.version || "0.0.0";
      }
      return "0.0.0";
    } catch {
      return "0.0.0";
    }
  }
  async getChangelog(owner, repo, branch) {
    try {
      const refRes = await this.octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
      const res = await this.octokit.rest.repos.getContent({ owner, repo, path: "CHANGELOG.md", ref: refRes.data.object.sha });
      const data = res.data;
      return data.content ? Buffer.from(data.content, "base64").toString("utf8") : "";
    } catch {
      return "";
    }
  }
}
class WorkflowService extends GitHubClient {
  async getLatestWorkflowRun() {
    try {
      const response = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: this.owner,
        repo: this.repo,
        per_page: 5
      });
      const runs = response.data.workflow_runs;
      const isRelevant = (run) => {
        var _a2;
        const name = run.name.toLowerCase();
        return name.includes("pages build and deployment") || name.includes("pages-build-deployment") || name.includes("pre-render") || ((_a2 = run.path) == null ? void 0 : _a2.includes("deploy.yml"));
      };
      const relevantRuns = runs.filter(isRelevant);
      if (relevantRuns.length === 0) return runs[0] || null;
      const latest = relevantRuns[0];
      const simultaneousPages = relevantRuns.find((run) => {
        const timeDiff = Math.abs(new Date(latest.created_at).getTime() - new Date(run.created_at).getTime());
        return timeDiff < 6e4 && run.name.toLowerCase().includes("pages");
      });
      return simultaneousPages || latest;
    } catch {
      return null;
    }
  }
  async triggerDeployWorkflow() {
    await this.octokit.rest.actions.createWorkflowDispatch({
      owner: this.owner,
      repo: this.repo,
      workflow_id: "deploy.yml",
      ref: this.branch
    });
  }
  async checkConnection() {
    await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.repo
    });
  }
  async getUserRepos() {
    const response = await this.octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: "updated"
    });
    return response.data.map((repo) => repo.full_name);
  }
  async fixWorkflowDispatch() {
    const content = `name: Auto Pre-render for OG Support

on:
  push:
    branches:
      - main
    paths:
      - 'notes/**/*.md'
      - 'src/index.html'
      - 'scripts/**/*.js'
      - 'js/**/*.js'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Sync Script
        run: |
          npm run build:css
          node scripts/sync.js

      - name: Commit and Push changes
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add index.html 404.html posts/*.html posts/file_index.json css/bundle.css js/**/*.js
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "chore: auto-generate static assets for OG support [skip ci]"
            git push origin main
          fi
`;
    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: ".github/workflows/deploy.yml",
      message: "chore: add workflow_dispatch trigger",
      content: Buffer.from(content).toString("base64"),
      branch: this.branch
    });
  }
}
class GitHubService {
  constructor(settings) {
    this.content = new ContentManager(settings);
    this.updater = new TemplateUpdater(settings);
    this.workflow = new WorkflowService(settings);
  }
  // --- Content Operations ---
  async getFileContent(path) {
    return this.content.getFileContent(path);
  }
  async uploadFile(path, content, message) {
    return this.content.uploadFile(path, content, message);
  }
  async deleteFileByPath(path) {
    return this.content.deleteFileByPath(path);
  }
  async createBatchCommit(files, message) {
    return this.content.createBatchCommit(files, message);
  }
  async getUploadedNotes() {
    return this.content.getUploadedNotes();
  }
  // --- Upstream / Update Operations ---
  async getUpstreamStatus(settings) {
    return this.updater.getUpstreamStatus();
  }
  async mergeUpstream(settings) {
    return this.updater.mergeUpstream();
  }
  async forceUpdate(settings) {
    return this.updater.forceUpdate();
  }
  async getTemplateVersion(owner, repo, branch) {
    return this.updater.getTemplateVersion(owner, repo, branch);
  }
  async getChangelog(owner, repo, branch) {
    return this.updater.getChangelog(owner, repo, branch);
  }
  async getUpstreamInfo() {
    return this.updater.getUpstreamInfo();
  }
  isVersionOlder(current, latest) {
    return this.updater.isVersionOlder(current, latest);
  }
  // --- Workflow / System Operations ---
  async getLatestWorkflowRun() {
    return this.workflow.getLatestWorkflowRun();
  }
  async triggerDeployWorkflow() {
    return this.workflow.triggerDeployWorkflow();
  }
  async checkConnection(settings) {
    return this.workflow.checkConnection();
  }
  async getUserRepos() {
    return this.workflow.getUserRepos();
  }
  async fixWorkflowDispatch() {
    return this.workflow.fixWorkflowDispatch();
  }
}
class DeploymentMonitor {
  constructor(service) {
    this.service = service;
  }
  async monitor(shareUrl) {
    const startTime = /* @__PURE__ */ new Date();
    let hasStarted = false;
    let attempts = 0;
    const maxAttempts = 20;
    console.log("[DeploymentMonitor] Monitoring started at:", startTime.toISOString());
    const poll = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        console.log("[DeploymentMonitor] Timed out");
        new obsidian.Notice("⚠️ Deployment requires check.", 3e3);
        return;
      }
      try {
        const lastRun = await this.service.getLatestWorkflowRun();
        if (!lastRun) {
          setTimeout(poll, 5e3);
          return;
        }
        const runTime = new Date(lastRun.created_at);
        const status = lastRun.status;
        const conclusion = lastRun.conclusion;
        if (runTime >= startTime || status === "in_progress" || status === "queued") {
          if (!hasStarted && (status === "in_progress" || status === "queued")) {
            hasStarted = true;
            new obsidian.Notice("🟡 Deployment in progress...", 3e3);
          }
          if (status === "completed") {
            if (conclusion === "success") {
              this.handleSuccess(shareUrl);
              return;
            } else if (conclusion === "failure") {
              new obsidian.Notice("🔴 Deployment failed. Check GitHub Actions.", 5e3);
              return;
            }
          }
        }
        setTimeout(poll, 5e3);
      } catch (e) {
        console.error("[DeploymentMonitor] Polling error:", e);
        setTimeout(poll, 1e4);
      }
    };
    setTimeout(poll, 1e4);
  }
  handleSuccess(shareUrl) {
    this.playSuccessSound();
    if (shareUrl) {
      new obsidian.Notice("🟢 Website is now live! URL copied to clipboard.", 6e3);
      navigator.clipboard.writeText(shareUrl);
    } else {
      new obsidian.Notice("🟢 Website updated successfully!", 6e3);
    }
  }
  playSuccessSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const playTone = (freq, startTime, duration) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(880, context.currentTime, 0.5);
      playTone(1318.51, context.currentTime + 0.1, 0.6);
    } catch (e) {
      console.error("[DeploymentMonitor] Failed to play sound:", e);
    }
  }
}
class CoreLogic {
  /**
   * Normalizes filenames for consistent encoding (NFC)
   */
  static normalizeName(name) {
    return name.normalize("NFC").replace(/\s+/g, "_");
  }
  /**
   * Basic Frontmatter Parser
   */
  static parseFrontmatter(content) {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
    const match = content.match(frontmatterRegex);
    const data = {};
    let body = content;
    if (match) {
      body = content.replace(frontmatterRegex, "").trim();
      const yaml = match[1];
      yaml.split("\n").forEach((line) => {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join(":").trim().replace(/^['"](.*)['"]$/, "$1");
          data[key] = value;
        }
      });
    }
    return { data, body };
  }
  /**
   * Clean text for metadata (remove markdown links, bold, etc.)
   */
  static cleanMetadataText(text) {
    if (!text) return "";
    return text.replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/[#*`~_]/g, "").replace(/\n/g, " ").trim();
  }
  /**
   * Inject metatags and title into template
   */
  static applyMetadataToTemplate(template, metadata, domain) {
    const { title, description, pageUrl, ogImage, ogType } = metadata;
    const replacements = {
      "{{TITLE}}": title || "SharePage",
      "{{DESCRIPTION}}": (this.cleanMetadataText(description) || "").replace(/"/g, "&quot;"),
      "{{PAGE_URL}}": pageUrl || domain,
      "{{OG_IMAGE}}": ogImage || domain + "/images/logo.png",
      "{{OG_TYPE}}": ogType || "website",
      "{{DOMAIN}}": domain
    };
    if (replacements["{{OG_IMAGE}}"] && !replacements["{{OG_IMAGE}}"].startsWith("http")) {
      let imgPath = replacements["{{OG_IMAGE}}"];
      if (imgPath.startsWith("/")) imgPath = imgPath.substring(1);
      replacements["{{OG_IMAGE}}"] = `${domain}/${imgPath}`;
    }
    let html = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.split(placeholder).join(value);
    }
    return html;
  }
  /**
   * Update Dashboard Content (Add/Remove links)
   */
  static updateDashboardContent(dashboardContent, noteName, dateStr, isNew = true, targetSection = "Inbox") {
    let currentLines = dashboardContent.split("\n");
    const cleanNoteName = this.normalizeName(noteName.replace(/\.md$/, ""));
    const linkRegex = new RegExp(`^\\s*[-*]\\s*\\[\\[${this.escapeRegExp(cleanNoteName)}(\\|[^\\]]*)?\\]\\]`);
    let existingLineIdx = -1;
    let currentSection = "";
    for (let i = 0; i < currentLines.length; i++) {
      const line = currentLines[i].trim();
      if (line.startsWith("## ")) {
        currentSection = line.substring(3).trim();
      }
      if (linkRegex.test(line)) {
        existingLineIdx = i;
        break;
      }
    }
    const isCorrectSection = currentSection === targetSection;
    if (isNew) {
      if (existingLineIdx !== -1 && !isCorrectSection) {
        currentLines.splice(existingLineIdx, 1);
        return this.updateDashboardContent(currentLines.join("\n"), noteName, dateStr, true, targetSection);
      } else if (existingLineIdx === -1) {
        const newLinkLine = `- [[${cleanNoteName}]] ${dateStr}`;
        const sectionHeader = `## ${targetSection}`;
        let sectionIdx = currentLines.findIndex((line) => line.trim() === sectionHeader);
        if (sectionIdx === -1 && targetSection !== "Inbox") {
          sectionIdx = currentLines.findIndex((line) => line.trim() === "## Inbox");
        }
        if (sectionIdx !== -1) {
          currentLines.splice(sectionIdx + 1, 0, newLinkLine);
        } else {
          currentLines.push("", `## ${targetSection}`, newLinkLine);
        }
      }
    } else {
      if (existingLineIdx !== -1) {
        currentLines.splice(existingLineIdx, 1);
      }
    }
    return currentLines.join("\n");
  }
  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
class DeleteContentModal extends obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.files = [];
    this.selectedShas = /* @__PURE__ */ new Set();
    this.isLoading = true;
    this.searchQuery = "";
    this.plugin = plugin;
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Manage Uploaded Content" });
    this.renderLoading();
    await this.loadFiles();
  }
  renderLoading() {
    const { contentEl } = this;
    const loadingContainer = contentEl.createDiv({ cls: "sharepage-loading-container" });
    loadingContainer.createEl("p", { text: "Fetching file list from GitHub..." });
    loadingContainer.style.textAlign = "center";
    loadingContainer.style.padding = "20px";
  }
  async loadFiles() {
    try {
      const service = new GitHubService(this.plugin.settings);
      this.files = await service.getUploadedNotes();
      this.isLoading = false;
      this.renderFileList();
    } catch (error) {
      new obsidian.Notice("Failed to load files: " + error.message);
      this.close();
    }
  }
  renderFileList() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Manage Uploaded Content" });
    if (this.files.length === 0) {
      contentEl.createEl("p", { text: 'No uploaded notes found in the "notes/" directory.' });
      return;
    }
    contentEl.createEl("p", {
      text: "Select documents you want to delete from your GitHub repository. This will NOT delete your local Obsidian files.",
      cls: "setting-item-description"
    });
    const searchContainer = contentEl.createDiv({ cls: "sharepage-search-container" });
    searchContainer.style.marginBottom = "15px";
    const searchInput = searchContainer.createEl("input", {
      type: "text",
      placeholder: "Search files...",
      value: this.searchQuery
    });
    searchInput.style.width = "100%";
    searchInput.style.padding = "8px";
    searchInput.style.borderRadius = "4px";
    searchInput.style.border = "1px solid var(--border-color)";
    searchInput.oninput = (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderFilteredList();
    };
    this.listEl = contentEl.createDiv({ cls: "sharepage-file-list" });
    this.listEl.style.maxHeight = "400px";
    this.listEl.style.overflowY = "auto";
    this.listEl.style.border = "1px solid var(--border-color)";
    this.listEl.style.borderRadius = "4px";
    this.listEl.style.padding = "10px";
    this.listEl.style.marginBottom = "20px";
    this.renderFilteredList();
    const actionContainer = contentEl.createDiv({ cls: "sharepage-modal-actions" });
    actionContainer.style.display = "flex";
    actionContainer.style.justifyContent = "flex-end";
    actionContainer.style.gap = "10px";
    const deleteBtn = new obsidian.ButtonComponent(actionContainer).setButtonText("Delete Selected").setWarning().setDisabled(true).onClick(() => this.confirmDeletion());
    this.deleteButton = deleteBtn;
    this.updateDeleteButtonState();
    new obsidian.ButtonComponent(actionContainer).setButtonText("Cancel").onClick(() => this.close());
  }
  renderFilteredList() {
    if (!this.listEl) return;
    this.listEl.empty();
    const filteredFiles = this.files.filter((file) => {
      if (file.name === "_dashboard.md") return false;
      if (!this.searchQuery) return true;
      const displayName = file.name.replace(/\.md$/, "").toLowerCase();
      return displayName.includes(this.searchQuery);
    });
    if (filteredFiles.length === 0) {
      const emptyMsg = this.listEl.createEl("p", { text: "No matching files found." });
      emptyMsg.style.textAlign = "center";
      emptyMsg.style.color = "var(--text-muted)";
      return;
    }
    filteredFiles.forEach((file) => {
      const item = this.listEl.createDiv({ cls: "sharepage-file-item" });
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.padding = "8px 0";
      item.style.borderBottom = "1px solid var(--background-modifier-border)";
      const checkbox = item.createEl("input", { type: "checkbox" });
      checkbox.style.marginRight = "10px";
      checkbox.checked = this.selectedShas.has(file.sha);
      checkbox.onclick = () => {
        if (checkbox.checked) {
          this.selectedShas.add(file.sha);
        } else {
          this.selectedShas.delete(file.sha);
        }
        this.updateDeleteButtonState();
      };
      const displayName = file.name.replace(/\.md$/, "");
      const nameSpan = item.createEl("span", { text: displayName });
      nameSpan.style.flexGrow = "1";
    });
  }
  updateDeleteButtonState() {
    if (this.deleteButton) {
      this.deleteButton.setDisabled(this.selectedShas.size === 0);
      if (this.selectedShas.size > 0) {
        this.deleteButton.setButtonText(`Delete Selected (${this.selectedShas.size})`);
      } else {
        this.deleteButton.setButtonText("Delete Selected");
      }
    }
  }
  confirmDeletion() {
    const count = this.selectedShas.size;
    if (confirm(`Are you sure you want to delete ${count} file(s) from GitHub? This action cannot be undone.`)) {
      this.executeDeletion();
    }
  }
  async executeDeletion() {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "Deleting Files..." });
    const statusEl = this.contentEl.createDiv();
    const progressEl = statusEl.createEl("p", { text: `Connecting to GitHub...` });
    try {
      const service = new GitHubService(this.plugin.settings);
      const startTime = /* @__PURE__ */ new Date();
      const batchFiles = [];
      progressEl.setText("📥 Fetching latest dashboard...");
      const dashboardFile = await service.getFileContent("notes/_dashboard.md");
      let updatedDashboard = dashboardFile ? dashboardFile.content : "";
      const total = this.selectedShas.size;
      let processed = 0;
      for (const sha of this.selectedShas) {
        const file = this.files.find((f) => f.sha === sha);
        if (file) {
          processed++;
          progressEl.setText(`Preparing deletion ${processed}/${total}: ${file.name}...`);
          batchFiles.push({
            path: file.path,
            content: null,
            isDeleted: true
          });
          const normalizedBase = CoreLogic.normalizeName(file.name.replace(/\.md$/, ""));
          batchFiles.push({
            path: `posts/${normalizedBase}.html`,
            content: null,
            isDeleted: true
          });
          if (updatedDashboard) {
            updatedDashboard = CoreLogic.updateDashboardContent(
              updatedDashboard,
              file.name,
              "",
              false
              // isNew = false for removal
            );
          }
        }
      }
      if (updatedDashboard && updatedDashboard !== (dashboardFile == null ? void 0 : dashboardFile.content)) {
        batchFiles.push({
          path: "notes/_dashboard.md",
          content: updatedDashboard
        });
      }
      progressEl.setText(`Committing changes to GitHub (Total ${batchFiles.length} operations)...`);
      await service.createBatchCommit(batchFiles, `chore: delete ${total} notes and cleanup dashboard`);
      this.renderSuccessScreen(service, startTime);
    } catch (error) {
      new obsidian.Notice("Deletion failed: " + error.message);
      this.renderFileList();
    }
  }
  renderSuccessScreen(service, startTime) {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "Deletion Request Complete" });
    const deployStatusEl = this.contentEl.createDiv({ cls: "sharepage-deploy-status" });
    deployStatusEl.style.padding = "20px";
    deployStatusEl.style.textAlign = "center";
    deployStatusEl.style.backgroundColor = "var(--background-secondary)";
    deployStatusEl.style.borderRadius = "8px";
    deployStatusEl.style.margin = "20px 0";
    const successMsg = deployStatusEl.createDiv({
      text: "📡 Request Sent Successfully"
    });
    successMsg.style.fontSize = "1.2em";
    successMsg.style.fontWeight = "bold";
    successMsg.style.marginBottom = "10px";
    deployStatusEl.createEl("p", {
      text: "Your files have been deleted and the dashboard has been updated on GitHub. GitHub Actions will now rebuild your site (~30s - 1min)."
    });
    new obsidian.Setting(this.contentEl).setName("Background Monitoring").setDesc("Site rebuild will be monitored in the background. A notification will appear when it is live.").addButton((btn) => btn.setButtonText("Got it!").setCta().onClick(() => {
      new DeploymentMonitor(service).monitor();
      this.close();
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
}
class SharePageSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "SharePage Settings" });
    this.renderUpdateSection(containerEl);
    containerEl.createEl("hr");
    this.renderContentManagementSection(containerEl);
    containerEl.createEl("hr");
    this.renderDeploymentSection(containerEl);
    containerEl.createEl("hr");
    this.renderGitHubConfigSection(containerEl);
    containerEl.createEl("hr");
    this.renderCustomStyleSection(containerEl);
    containerEl.createEl("hr");
    this.renderUserGuideSection(containerEl);
  }
  /**
   * 1. Template Sync Section
   */
  renderUpdateSection(containerEl) {
    containerEl.createEl("h3", { text: "🔄 Template Sync (Updater)" });
    const versionInfo = containerEl.createDiv({ cls: "sharepage-version-info" });
    versionInfo.style.marginBottom = "10px";
    versionInfo.style.fontSize = "0.9em";
    versionInfo.style.color = "var(--text-muted)";
    versionInfo.setText("Current Template Version: Loading...");
    const syncSetting = new obsidian.Setting(containerEl).setName("Check for Template Updates").setDesc("Keep your GitHub repository up to date with the official SharePage template").addButton(
      (button) => button.setButtonText("Check for Updates").onClick(() => this.handleVersionCheck(button, versionInfo, syncSetting))
    );
    this.handleVersionCheck(null, versionInfo, null, true);
  }
  async handleVersionCheck(button, versionInfo, syncSetting, silent = false) {
    if (!this.plugin.settings.githubToken || !this.plugin.settings.repoOwner) {
      if (!silent) new obsidian.Notice("Please configure GitHub settings first");
      return;
    }
    try {
      if (button) {
        button.setDisabled(true);
        button.setButtonText("Checking...");
      }
      const service = new GitHubService(this.plugin.settings);
      const [status, upstream] = await Promise.all([
        service.getUpstreamStatus(),
        service.getUpstreamInfo()
      ]);
      const currentVer = await service.getTemplateVersion(this.plugin.settings.repoOwner, this.plugin.settings.repoName, this.plugin.settings.branch);
      const latestVer = await service.getTemplateVersion(upstream.owner, upstream.repo, upstream.branch);
      const hasNewVersion = service.isVersionOlder(currentVer, latestVer);
      versionInfo.setText(`Current: v${currentVer} | Latest: v${latestVer}`);
      if (syncSetting) {
        this.renderUpdateActions(syncSetting, service, status, hasNewVersion, upstream, currentVer, latestVer);
      }
    } catch (e) {
      if (!silent) new obsidian.Notice("Failed to check updates: " + e.message);
    } finally {
      if (button) {
        button.setDisabled(false);
        button.setButtonText("Check for Updates");
      }
    }
  }
  async renderUpdateActions(syncSetting, service, status, hasNewVersion, upstream, currentVer, latestVer) {
    syncSetting.controlEl.empty();
    if (!hasNewVersion && status.behind_by === 0) {
      syncSetting.addExtraButton((btn) => btn.setIcon("check").setTooltip("Up to date"));
      return;
    }
    const changelog = await service.getChangelog(upstream.owner, upstream.repo, upstream.branch);
    if (changelog) {
      const { containerEl } = this;
      const logContainer = containerEl.createDiv({ cls: "sharepage-changelog" });
      logContainer.style.maxHeight = "200px";
      logContainer.style.overflowY = "auto";
      logContainer.style.padding = "10px";
      logContainer.style.fontSize = "0.85em";
      logContainer.style.backgroundColor = "var(--background-secondary)";
      logContainer.style.borderRadius = "4px";
      logContainer.style.marginTop = "10px";
      logContainer.innerHTML = changelog;
    }
    syncSetting.addButton(
      (btn) => btn.setButtonText("Update Now (Sync)").setCta().onClick(async () => {
        btn.setDisabled(true);
        btn.setButtonText("Updating...");
        await service.mergeUpstream();
        new obsidian.Notice("Successfully synced! Verifying deployment...");
        new DeploymentMonitor(service).monitor();
        this.display();
      })
    );
    syncSetting.addButton(
      (btn) => btn.setButtonText("Force Update").setWarning().onClick(async () => {
        if (!confirm("Warning: Force update will overwrite core files. Your notes/images are safe. Proceed?")) return;
        btn.setDisabled(true);
        btn.setButtonText("Force Updating...");
        await service.forceUpdate();
        new obsidian.Notice("Force update completed!");
        new DeploymentMonitor(service).monitor();
        this.display();
      })
    );
  }
  /**
   * 2. Content Management Section
   */
  renderContentManagementSection(containerEl) {
    containerEl.createEl("h3", { text: "📂 Content Management" });
    new obsidian.Setting(containerEl).setName("Manage Uploaded Content").setDesc("View and delete files already uploaded to GitHub").addButton(
      (button) => button.setButtonText("Open Manager").onClick(() => {
        new DeleteContentModal(this.app, this.plugin).open();
      })
    );
  }
  /**
   * 3. Deployment Status Section
   */
  renderDeploymentSection(containerEl) {
    containerEl.createEl("h3", { text: "🚀 Deployment Status" });
    const statusSetting = new obsidian.Setting(containerEl).setName("Latest Build Status").setDesc("Checking GitHub Actions...").addButton(
      (button) => button.setButtonText("Refresh Status").onClick(() => this.display())
    );
    this.refreshDeploymentStatus(statusSetting);
    const refreshInterval = window.setInterval(() => {
      if (!statusSetting.settingEl.parentElement) {
        window.clearInterval(refreshInterval);
        return;
      }
      this.refreshDeploymentStatus(statusSetting);
    }, 15e3);
  }
  async refreshDeploymentStatus(setting) {
    if (!this.plugin.settings.githubToken || !this.plugin.settings.repoOwner) {
      setting.setDesc("GitHub not configured.");
      return;
    }
    try {
      const service = new GitHubService(this.plugin.settings);
      const lastRun = await service.getLatestWorkflowRun();
      if (!lastRun) {
        setting.setDesc("No deployment history found.");
        return;
      }
      const isCompleted = lastRun.status === "completed";
      const statusText = isCompleted ? lastRun.conclusion === "success" ? "🟢 Success (Deployed)" : `🔴 Failed (${lastRun.conclusion})` : `🟡 ${lastRun.status}...`;
      setting.setDesc(`Last build: ${statusText} (${new Date(lastRun.updated_at).toLocaleString()})`);
      setting.addButton(
        (btn) => btn.setButtonText("View Logs").setTooltip("Open GitHub Actions page").onClick(() => window.open(lastRun.html_url))
      );
      if (lastRun.conclusion === "failure") {
        this.renderRetryAction(setting, service);
      }
    } catch (e) {
      setting.setDesc("Error fetching status: " + e.message);
    }
  }
  renderRetryAction(setting, service) {
    setting.addButton(
      (btn) => btn.setButtonText("Retry Deploy").setCta().onClick(async () => {
        await this.handleWorkflowRetry(btn, service);
      })
    );
  }
  async handleWorkflowRetry(btn, service) {
    try {
      btn.setDisabled(true);
      await service.triggerDeployWorkflow();
      new obsidian.Notice("Deployment triggered!");
      setTimeout(() => this.display(), 2e3);
    } catch (e) {
      if (e.message.includes("workflow_dispatch") && confirm("Workflow trigger is missing. Fix it now?")) {
        btn.setButtonText("Fixing...");
        await service.fixWorkflowDispatch();
        new obsidian.Notice("Workflow updated! Retrying in 3 seconds...");
        setTimeout(() => btn.click(), 3e3);
      } else {
        new obsidian.Notice("Failed to trigger: " + e.message);
        btn.setDisabled(false);
      }
    }
  }
  /**
   * 4. GitHub Configuration Section
   */
  renderGitHubConfigSection(containerEl) {
    containerEl.createEl("h3", { text: "⚙️ GitHub Configuration" });
    this.renderTokenSetting(containerEl);
    this.renderRepoQuickSelect(containerEl);
    this.renderRepoBasicSettings(containerEl);
    this.renderConnectionTest(containerEl);
  }
  renderTokenSetting(containerEl) {
    new obsidian.Setting(containerEl).setName("GitHub Token").setDesc("Personal Access Token with repo and workflow permissions").addText(
      (text) => text.setPlaceholder("ghp_...").setValue(this.plugin.settings.githubToken).onChange(async (value) => {
        this.plugin.settings.githubToken = value.trim();
        await this.plugin.saveSettings();
      })
    ).addButton(
      (button) => button.setButtonText("Generate Token").setTooltip("Open GitHub to create a token").onClick(() => window.open("https://github.com/settings/tokens/new?scopes=repo,workflow&description=Obsidian%20SharePage"))
    );
  }
  renderRepoQuickSelect(containerEl) {
    const repoLoadingSetting = new obsidian.Setting(containerEl).setName("Quick Repository Select").setDesc("Load your repositories automatically").addButton(
      (button) => button.setButtonText("Load Repositories").onClick(async () => {
        if (!this.plugin.settings.githubToken) return new obsidian.Notice("Token required");
        try {
          const service = new GitHubService(this.plugin.settings);
          const repos = await service.getUserRepos();
          repoLoadingSetting.controlEl.empty();
          repoLoadingSetting.addDropdown((dropdown) => {
            dropdown.addOption("", "Select a repository...");
            repos.forEach((repo) => dropdown.addOption(repo, repo));
            dropdown.onChange(async (value) => {
              if (!value) return;
              const [owner, name] = value.split("/");
              this.plugin.settings.repoOwner = owner;
              this.plugin.settings.repoName = name;
              await this.plugin.saveSettings();
              this.display();
            });
          });
        } catch (e) {
          new obsidian.Notice("Load failed: " + e.message);
        }
      })
    );
  }
  renderRepoBasicSettings(containerEl) {
    new obsidian.Setting(containerEl).setName("Repository Owner").setDesc("Automatically set via Quick Select").addText(
      (text) => text.setValue(this.plugin.settings.repoOwner).setDisabled(true)
      // Prevent manual typos
    );
    new obsidian.Setting(containerEl).setName("Repository Name").setDesc("Automatically set via Quick Select").addText(
      (text) => text.setValue(this.plugin.settings.repoName).setDisabled(true)
      // Prevent manual typos
    );
    new obsidian.Setting(containerEl).setName("Branch").setDesc("Default: main").addText(
      (text) => text.setPlaceholder("main").setValue(this.plugin.settings.branch).onChange(async (v) => {
        this.plugin.settings.branch = v || "main";
        await this.plugin.saveSettings();
      })
    );
  }
  renderConnectionTest(containerEl) {
    new obsidian.Setting(containerEl).setName("Test Connection").addButton((button) => button.setButtonText("Test").onClick(async () => {
      try {
        const service = new GitHubService(this.plugin.settings);
        await service.checkConnection();
        new obsidian.Notice("Connection successful!");
      } catch (e) {
        new obsidian.Notice("Connection failed: " + e.message);
      }
    }));
  }
  /**
   * 5. Custom Style Section
   */
  renderCustomStyleSection(containerEl) {
    var _a2, _b;
    containerEl.createEl("h3", { text: "🎨 Custom Style" });
    const cssSetting = new obsidian.Setting(containerEl).setName("Custom CSS").setDesc("Standard CSS syntax. Supports --color-accent-primary.").addTextArea(
      (text) => text.setPlaceholder("/* Write your CSS here */").setValue(this.plugin.settings.customCss).onChange(async (value) => {
        this.plugin.settings.customCss = value;
        await this.plugin.saveSettings();
      })
    );
    (_a2 = cssSetting.controlEl.querySelector("textarea")) == null ? void 0 : _a2.style.setProperty("width", "100%");
    (_b = cssSetting.controlEl.querySelector("textarea")) == null ? void 0 : _b.style.setProperty("height", "150px");
    new obsidian.Setting(containerEl).setName("Sync Custom Style").addButton(
      (button) => button.setButtonText("Save & Sync Style").setCta().onClick(async () => this.handleStyleSync(button))
    );
    const guideContainer = containerEl.createDiv({ cls: "sharepage-style-guide-container" });
    guideContainer.style.marginTop = "15px";
    const details = guideContainer.createEl("details");
    details.style.backgroundColor = "var(--background-secondary)";
    details.style.padding = "10px";
    details.style.borderRadius = "6px";
    details.style.border = "1px solid var(--border-color)";
    details.style.fontSize = "0.9em";
    const summary = details.createEl("summary");
    summary.setText("💡 Quick Style Guide (요약 가이드)");
    summary.style.fontWeight = "bold";
    summary.style.cursor = "pointer";
    summary.style.color = "var(--text-accent)";
    details.createEl("div", {
      text: "나만의 사이트 디자인을 위한 핵심 변수 요약입니다. 자세한 내용은 포크한 레포지토리의 가이드 문서를 참고하세요.",
      cls: "setting-item-description"
    }).style.margin = "10px 0";
    const pre = details.createEl("pre");
    pre.style.fontSize = "0.85em";
    pre.style.backgroundColor = "var(--background-primary)";
    pre.style.padding = "10px";
    pre.style.borderRadius = "4px";
    pre.style.overflowX = "auto";
    pre.innerHTML = `<code>/* 예시: 핵심 변수 변경 */
:root {
  --color-accent-primary: #ff5722; /* 포인트 색상 */
  --text-body-1: 17px;           /* 본문 크기 */
  --text-heading-1: 32px;        /* 제목 크기 */
}

/* 다크모드 전용 설정 */
body.theme-dark {
  --color-surface-base: #121212;
}</code>`;
    const linksDiv = details.createDiv();
    linksDiv.style.marginTop = "10px";
    linksDiv.style.display = "flex";
    linksDiv.style.flexWrap = "wrap";
    linksDiv.style.gap = "15px";
    linksDiv.innerHTML = `
            <a href="https://github.com/wis-graph/obsidian-sharepage/blob/main/CUSTOM_STYLE_GUIDE_KR.md" target="_blank">📄 Full Guide (KR)</a>
            <a href="https://github.com/wis-graph/obsidian-sharepage/blob/main/CUSTOM_STYLE_GUIDE.md" target="_blank">📄 Full Guide (EN)</a>
            <a href="https://github.com/wis-graph/sharepage/tree/main/css" target="_blank">🎨 View CSS Source (GitHub)</a>
        `;
  }
  async handleStyleSync(button) {
    if (!this.plugin.settings.githubToken || !this.plugin.settings.repoOwner) {
      return new obsidian.Notice("Configure GitHub first");
    }
    try {
      button.setDisabled(true).setButtonText("Syncing...");
      const service = new GitHubService(this.plugin.settings);
      const encoder = new TextEncoder();
      const buffer = encoder.encode(this.plugin.settings.customCss).buffer;
      await service.uploadFile("css/custom.css", buffer, "Update custom styles via Obsidian");
      new obsidian.Notice("🎨 Custom styles uploaded!");
    } catch (e) {
      new obsidian.Notice("Sync failed: " + e.message);
    } finally {
      button.setDisabled(false).setButtonText("Save & Sync Style");
    }
  }
  /**
   * 6. User Guide Section
   */
  renderUserGuideSection(containerEl) {
    containerEl.createEl("h3", { text: "📖 User Guide" });
    const guideContainer = containerEl.createEl("div", { cls: "sharepage-guide-container" });
    guideContainer.style.backgroundColor = "var(--background-secondary)";
    guideContainer.style.padding = "20px";
    guideContainer.style.borderRadius = "8px";
    guideContainer.style.fontSize = "0.92em";
    guideContainer.style.lineHeight = "1.6";
    guideContainer.style.border = "1px solid var(--border-color)";
    guideContainer.innerHTML = `
			<div style="margin-bottom: 20px;">
				<h4 style="margin-top: 0; color: var(--text-accent);">1단계: GitHub 레포지토리 준비 (Repo Setup)</h4>
				<ol>
					<li>GitHub에서 <a href="https://github.com/wis-graph/sharepage" target="_blank">SharePage 템플릿</a> 저장소로 이동하여 <b>Fork</b> 버튼을 눌러 본인의 계정으로 복사합니다.</li>
					<li>본인의 레포지토리에서 <b>Settings > Pages</b> 탭으로 이동합니다.</li>
					<li><b>Build and deployment > Branch</b> 항목에서 <code>main</code> 브랜치와 <code>/(root)</code> 폴더를 선택하고 <b>Save</b> 버튼을 누릅니다.</li>
					<li>상단 <b>Actions</b> 탭으로 이동하여 <span style="color: var(--text-success); font-weight: bold;">"I understand my workflows, go ahead and enable them"</span> 버튼을 클릭하여 활성화합니다.</li>
				</ol>
			</div>

			<div style="margin-bottom: 20px;">
				<h4 style="color: var(--text-accent);">2단계: 플러그인 연결 (Plugin Connection)</h4>
				<ol>
					<li>위의 <b>GitHub Token</b> 섹션에서 'Generate Token'을 클릭하여 <code>repo</code>와 <code>workflow</code> 권한이 체크된 토큰을 생성 후 붙여넣습니다.</li>
					<li><b>Quick Repository Select</b> 섹션에서 'Load Repositories'를 눌러 포크한 레포지토리를 선택합니다.</li>
					<li><b>Test Connection</b> 버튼을 눌러 "Connection successful!" 메시지가 뜨는지 확인합니다.</li>
				</ol>
			</div>

			<div style="margin-bottom: 20px;">
				<h4 style="color: var(--text-accent);">3단계: 노트 게시 및 관리 (Publishing)</h4>
				<ul>
					<li><b>게시:</b> 공유하고 싶은 노트에서 명령 팔레트(<code>Cmd/Ctrl + P</code>)를 열고 <code>SharePage: Share current note</code>를 실행합니다.</li>
					<li><b>삭제:</b> 게시된 노트를 GitHub에서 제거하려면 <code>SharePage: Unshare current note</code>를 실행하거나 'Content Management' 모달을 이용하세요.</li>
					<li><b>스타일:</b> 'Custom Style' 섹션에 CSS를 작성하고 Sync 하면 나만의 디자인을 적용할 수 있습니다.</li>
				</ul>
			</div>

			<div style="margin-bottom: 20px;">
				<h4 style="color: var(--text-accent);">📡 배포 상태 모니터링 (Deployment Status)</h4>
				<p style="margin-bottom: 5px;">GitHub에 변경 결사항이 전달되면 자동으로 사이트 재빌드(GitHub Actions)가 시작됩니다.</p>
				<ul>
					<li><b>언제 작동하나요?</b> 노트 업로드/삭제, 템플릿 업데이트(Sync), 커스텀 스타일 적용 시 즉시 시작됩니다.</li>
					<li><b>확인 방법:</b> 설정 상단의 'Deployment Status'에서 실시간 상태를 볼 수 있습니다.</li>
					<li><b>소요 시간:</b> 약 30초 ~ 1분 정도 소요되며, 완료되어야 웹사이트에 실제 내용이 반영됩니다.</li>
				</ul>
			</div>

			<div style="border-top: 1px solid var(--border-color); padding-top: 15px; margin-top: 15px;">
				<h4 style="color: var(--text-warning);">💡 자주 묻는 질문 (FAQ)</h4>
				<ul style="list-style-type: none; padding-left: 0;">
					<li><b>Q. 공유했는데 페이지가 안 떠요.</b><br>
						A. GitHub 서버에서 사이트를 만드는 중일 수 있습니다. 'Deployment Status'가 🟢 Success가 될 때까지 기다려 주세요.</li>
					<li style="margin-top: 10px;"><b>Q. 템플릿 업데이트는 어떻게 하나요?</b><br>
						A. 'Template Sync' 섹션에서 'Check for Updates'를 누르세요. 새로운 기능이 있다면 버튼 하나로 간단히 동기화할 수 있습니다.</li>
				</ul>
			</div>
		`;
  }
}
class ImageHandler {
  constructor(app, service) {
    this.app = app;
    this.service = service;
  }
  async collectImagesForUpload(content) {
    const imageLinks = this.extractImageLinks(content);
    const images = [];
    for (const imageName of imageLinks) {
      const file = this.findImageFile(imageName);
      if (!file) continue;
      const buffer = await this.app.vault.readBinary(file);
      const normalizedPath = `images/${CoreLogic.normalizeName(file.name)}`;
      images.push({
        path: normalizedPath,
        content: buffer,
        isBinary: true
      });
    }
    return images;
  }
  async syncImagesWithGitHub(content) {
    const imageLinks = this.extractImageLinks(content);
    if (imageLinks.length === 0) return;
    console.log(`[ImageHandler] Syncing ${imageLinks.length} images...`);
    for (const imageName of imageLinks) {
      await this.uploadSingleImage(imageName);
    }
  }
  findImageFile(imageName) {
    const extensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ""];
    for (const ext of extensions) {
      const path = ext ? imageName + ext : imageName;
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof obsidian.TFile) return file;
    }
    console.warn(`[ImageHandler] Image not found: ${imageName}`);
    return null;
  }
  async uploadSingleImage(imageName) {
    try {
      const file = this.findImageFile(imageName);
      if (!file) return;
      const buffer = await this.app.vault.readBinary(file);
      const targetPath = `images/${file.name}`;
      await this.service.uploadFile(targetPath, buffer, `Upload image: ${file.name}`);
      console.log(`[ImageHandler] Synced: ${targetPath}`);
    } catch (error) {
      console.error(`[ImageHandler] Sync failed for ${imageName}:`, error);
    }
  }
  extractImageLinks(content) {
    const imageRegex = /!\[\[(.*?)\]\]/g;
    const links = [];
    let match;
    while ((match = imageRegex.exec(content)) !== null) {
      links.push(match[1]);
    }
    return links;
  }
}
class Classifier {
  /**
   * @param metadata - Note frontmatter data
   * @returns - Dashboard section name (e.g., 'YouTube', 'Inbox')
   */
  static determineSection(metadata) {
    if (!metadata) return "Inbox";
    const type = (metadata.type || metadata.source_type || "").toLowerCase().trim();
    if (type === "youtube") {
      return "YouTube";
    }
    return "Inbox";
  }
}
const ProcessorUtils = {
  cleanMetadataText: (text) => {
    if (!text) return "";
    return text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/(\*\*|__|~~|`)(.*?)\1/g, "$2").replace(/(\*|_)(.*?)\1/g, "$2").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/[#*`_~\[\]]/g, "").replace(/\s+/g, " ").trim();
  },
  extractYouTubeId: (text) => {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = text.match(youtubeRegex);
    return match ? match[1] : null;
  }
};
class StandardProcessor {
  static prepareMetadata(data, body, filename) {
    const title = data.title || filename.replace(/\.md$/, "").replace(/_/g, " ");
    let description = data.description || data.summary || "";
    if (!description) {
      description = ProcessorUtils.cleanMetadataText(body).substring(0, 150) + "...";
    } else {
      description = ProcessorUtils.cleanMetadataText(description);
    }
    let ogImage = data.thumbnail || data.url || "";
    if (ogImage.startsWith("[[") && ogImage.endsWith("]]")) {
      ogImage = ogImage.slice(2, -2);
    }
    if (!ogImage) {
      const imageMatch = body.replace(/```[\s\S]*?```/g, "").match(/!\[\[([^\]]+)\]\]/) || body.match(/!\[.*?\]\((.*?)\)/);
      if (imageMatch) ogImage = imageMatch[1];
    }
    return {
      title,
      description,
      ogImage: ogImage.startsWith("http") ? ogImage : ogImage ? `images/${ogImage}` : "",
      ogType: "website"
    };
  }
}
class YouTubeProcessor {
  static prepareMetadata(data, body, filename) {
    const baseTitle = data.title || filename.replace(/\.md$/, "").replace(/_/g, " ");
    const title = `📺 ${baseTitle}`;
    let description = data.description || data.summary || "";
    if (!description) {
      description = ProcessorUtils.cleanMetadataText(body).substring(0, 150) + "...";
    } else {
      description = ProcessorUtils.cleanMetadataText(description);
    }
    let ytId = ProcessorUtils.extractYouTubeId(data.thumbnail || data.url || "");
    if (!ytId) {
      ytId = ProcessorUtils.extractYouTubeId(body);
    }
    const ogImage = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : data.thumbnail ? data.thumbnail.startsWith("http") ? data.thumbnail : `images/${data.thumbnail}` : "";
    return {
      title,
      description,
      ogImage,
      ogType: "video.other"
    };
  }
}
class NotePublisher {
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
    this.service = new GitHubService(settings);
  }
  async share(file) {
    if (!this.isValidConfiguration()) return;
    try {
      new obsidian.Notice("📡 Preparing to share...", 2e3);
      const content = await this.app.vault.read(file);
      const metadata = this.getNoteMetadata(file);
      new obsidian.Notice("📥 Fetching system files...", 2e3);
      const { template, dashboard } = await this.fetchRequiredFiles();
      new obsidian.Notice("🧠 Processing content...", 2e3);
      const html = this.renderNoteHtml(content, template, metadata);
      const updatedDashboard = this.updateDashboard(content, dashboard, `${metadata.webFriendlyName}.md`);
      const batch = await this.prepareUploadBatch(content, html, updatedDashboard, metadata);
      new obsidian.Notice(`📤 Sharing ${batch.length} files...`, 3e3);
      await this.service.createBatchCommit(batch, `Share: ${file.name} (Hybrid Render)`);
      await this.updateLocalFrontmatter(file, metadata.shareUrl);
      this.finalizeShare(metadata.shareUrl);
    } catch (error) {
      this.handleShareError(error);
    }
  }
  async fetchRequiredFiles() {
    const [templateFile, dashboardFile] = await Promise.all([
      this.service.getFileContent("src/index.html"),
      this.service.getFileContent("notes/_dashboard.md")
    ]);
    if (!templateFile) throw new Error("src/index.html not found on GitHub.");
    return {
      template: templateFile.content,
      dashboard: (dashboardFile == null ? void 0 : dashboardFile.content) || "## Inbox\n"
    };
  }
  renderNoteHtml(content, template, metadata) {
    const { data, body } = CoreLogic.parseFrontmatter(content);
    const docType = (data.type || data.source_type || "standard").toLowerCase();
    const mdFilename = `${metadata.webFriendlyName}.md`;
    const processor = docType === "youtube" ? YouTubeProcessor : StandardProcessor;
    const processResult = processor.prepareMetadata(data, body, mdFilename);
    return CoreLogic.applyMetadataToTemplate(template, {
      ...processResult,
      pageUrl: metadata.shareUrl
    }, metadata.domain);
  }
  updateDashboard(content, dashboardText, mdFilename) {
    const { data } = CoreLogic.parseFrontmatter(content);
    const section = Classifier.determineSection(data);
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    return CoreLogic.updateDashboardContent(dashboardText, mdFilename, today, true, section);
  }
  async prepareUploadBatch(content, html, dashboard, metadata) {
    const batch = [
      { path: metadata.targetPath, content },
      { path: `posts/${metadata.webFriendlyName}.html`, content: html },
      { path: "notes/_dashboard.md", content: dashboard }
    ];
    const imageHandler = new ImageHandler(this.app, this.service);
    const images = await imageHandler.collectImagesForUpload(content);
    batch.push(...images);
    return batch;
  }
  finalizeShare(shareUrl) {
    new obsidian.Notice(`📤 Content uploaded! Site rebuilding...`, 5e3);
    navigator.clipboard.writeText(shareUrl);
    new DeploymentMonitor(this.service).monitor(shareUrl);
  }
  handleShareError(error) {
    console.error("[NotePublisher] Share failed:", error);
    new obsidian.Notice(`Error: ${error.message}`);
  }
  // --- Legacy Bridge / Domain Renaming ---
  async publish(file) {
    return this.share(file);
  }
  async unshare(file) {
    if (!this.isValidConfiguration()) return;
    try {
      const { webFriendlyName, targetPath } = this.getNoteMetadata(file);
      new obsidian.Notice(`📡 Preparing to unshare: ${file.name}...`, 2e3);
      const dashboardFile = await this.service.getFileContent("notes/_dashboard.md");
      const dashboardContent = (dashboardFile == null ? void 0 : dashboardFile.content) || "";
      const batch = [
        { path: targetPath, isDeleted: true },
        // Delete MD
        { path: `posts/${webFriendlyName}.html`, isDeleted: true }
        // Delete HTML
      ];
      if (dashboardContent) {
        const updatedDashboard = CoreLogic.updateDashboardContent(
          dashboardContent,
          `${webFriendlyName}.md`,
          "",
          false
          // isNew = false for removal
        );
        if (updatedDashboard !== dashboardContent) {
          batch.push({
            path: "notes/_dashboard.md",
            content: updatedDashboard
          });
        }
      }
      new obsidian.Notice(`📤 Deleting files and updating dashboard...`, 3e3);
      await this.service.createBatchCommit(batch, `Unshare: ${file.name}`);
      this.finalizeUnshare(file);
    } catch (error) {
      this.handleShareError(error);
    }
  }
  finalizeUnshare(file) {
    new obsidian.Notice("Note deleted! Deployment refresh starting.", 6e3);
    new DeploymentMonitor(this.service).monitor();
    this.app.fileManager.processFrontMatter(file, (front) => {
      delete front["sharepage_updated"];
      delete front["sharepage_url"];
    });
  }
  async delete(file) {
    return this.unshare(file);
  }
  isValidConfiguration() {
    if (!this.settings.githubToken) {
      new obsidian.Notice("Please configure GitHub token in settings");
      return false;
    }
    if (!this.settings.repoOwner || !this.settings.repoName) {
      new obsidian.Notice("Please configure GitHub repository in settings");
      return false;
    }
    return true;
  }
  getNoteMetadata(file) {
    const noteName = file.name.replace(".md", "");
    const normalizedBase = CoreLogic.normalizeName(noteName);
    const targetPath = `notes/${normalizedBase}.md`;
    const owner = this.settings.repoOwner.toLowerCase();
    const repo = this.settings.repoName.toLowerCase();
    const domain = repo === `${owner}.github.io` ? `https://${owner}.github.io` : `https://${owner}.github.io/${repo}`;
    const shareUrl = `${domain}/posts/${normalizedBase}`;
    return { webFriendlyName: normalizedBase, targetPath, shareUrl, domain };
  }
  async updateLocalFrontmatter(file, shareUrl) {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter["sharepage_updated"] = (/* @__PURE__ */ new Date()).toLocaleString();
      frontmatter["sharepage_url"] = shareUrl;
    });
  }
}
class SharePagePlugin extends obsidian.Plugin {
  async onload() {
    console.log("Loading SharePage plugin");
    await this.loadSettings();
    this.addRibbonIcon("github", "SharePage", () => {
      new obsidian.Notice("SharePage: Right-click a note or use the command to share");
    });
    this.addCommand({
      id: "share-note",
      name: "Share current note to GitHub",
      callback: () => {
        this.shareCurrentNote();
      }
    });
    this.addCommand({
      id: "update-note",
      name: "Update current note on GitHub",
      callback: () => {
        this.shareCurrentNote();
      }
    });
    this.addCommand({
      id: "delete-note",
      name: "Delete current note from GitHub",
      callback: () => {
        this.deleteCurrentNote();
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof obsidian.TFile && file.extension === "md") {
          menu.addItem((item) => {
            item.setTitle("Share to GitHub").setIcon("github").onClick(() => {
              this.shareNote(file);
            });
          });
          menu.addItem((item) => {
            item.setTitle("Delete from GitHub").setIcon("trash").onClick(() => {
              this.deleteNote(file);
            });
          });
        }
      })
    );
    this.addSettingTab(new SharePageSettingTab(this.app, this));
  }
  onunload() {
    console.log("Unloading SharePage plugin");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    try {
      const envPath = `${this.manifest.dir}/.env`;
      if (await this.app.vault.adapter.exists(envPath)) {
        const envContent = await this.app.vault.adapter.read(envPath);
        const match = envContent.match(/GITHUB_TOKEN=(.*)/);
        if (match && match[1]) {
          this.settings.githubToken = match[1].trim();
        }
      }
    } catch (e) {
      console.error("Failed to load .env file:", e);
    }
  }
  async saveSettings() {
    const settingsToSave = { ...this.settings };
    delete settingsToSave.githubToken;
    await this.saveData(settingsToSave);
    try {
      const envPath = `${this.manifest.dir}/.env`;
      const envContent = `GITHUB_TOKEN=${this.settings.githubToken || ""}
`;
      await this.app.vault.adapter.write(envPath, envContent);
    } catch (e) {
      console.error("Failed to save .env file:", e);
    }
  }
  async shareCurrentNote() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new obsidian.Notice("No active note found");
      return;
    }
    await this.shareNote(activeFile);
  }
  async deleteCurrentNote() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new obsidian.Notice("No active note found");
      return;
    }
    await this.deleteNote(activeFile);
  }
  async deleteNote(file) {
    const publisher = new NotePublisher(this.app, this.settings);
    await publisher.delete(file);
  }
  async shareNote(file) {
    const publisher = new NotePublisher(this.app, this.settings);
    await publisher.publish(file);
  }
}
module.exports = SharePagePlugin;
//# sourceMappingURL=main.js.map
