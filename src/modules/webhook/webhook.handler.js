import { env } from "../../../config/env.js";
import { mapBitbucketPushEvent } from "./mappers/bitbucket.mapper.js";
import { mapGitHubPushEvent } from "./mappers/github.mapper.js";

const SUPPORTED_PROVIDERS = ["github", "bitbucket"];

const handlers = {
  github: {
    validateRequest(req) {
      return req.headers["x-github-event"] === env.githubWebhookEvent;
    },
    mapPushEvent: mapGitHubPushEvent
  },
  bitbucket: {
    validateRequest(req) {
      return req.headers["x-event-key"] === env.bitbucketWebhookEventKey;
    },
    mapPushEvent: mapBitbucketPushEvent
  }
};

export function getWebhookHandler() {
  const provider = String(env.gitProvider || "").toLowerCase();
  const handler = handlers[provider];

  if (!handler) {
    throw new Error(
      `GIT_PROVIDER nao configurado ou invalido: ${provider || "undefined"}. Use: ${SUPPORTED_PROVIDERS.join(", ")}`
    );
  }

  return {
    provider,
    ...handler
  };
}
