import type {
  GameLogDetail,
  LogTemplateDetail,
  LogTemplateKey,
  LogTextDetail,
} from "./types.js";

export function logText(text: string): LogTextDetail {
  return {
    type: "text",
    text,
  };
}

export function logTemplate(
  template: LogTemplateKey,
  params: LogTemplateDetail["params"],
): LogTemplateDetail {
  return {
    type: "template",
    template,
    params,
  };
}

export function isLogTextDetail(detail: GameLogDetail): detail is LogTextDetail {
  return detail.type === "text";
}

export function renderLogDetail(
  detail: GameLogDetail,
  resolvePlayerName: (playerId: string) => string = (playerId) => playerId,
): string {
  if (detail.type === "text") {
    return detail.text;
  }
  return renderTemplate(detail, resolvePlayerName);
}

function renderTemplate(
  detail: LogTemplateDetail,
  resolvePlayerName: (playerId: string) => string,
): string {
  switch (detail.template) {
    case "equipment.coffee_mug.pass_turn": {
      const targetPlayerId = String(detail.params.targetPlayerId ?? "");
      return `used Coffee Mug and passed turn to ${resolvePlayerName(targetPlayerId)}`;
    }
    case "designate_cutter.selected": {
      const targetPlayerName = String(detail.params.targetPlayerName ?? "").trim();
      if (targetPlayerName.length > 0) {
        return `designated ${targetPlayerName} to cut`;
      }
      const targetPlayerId = String(detail.params.targetPlayerId ?? "");
      const resolvedTargetName = String(resolvePlayerName(targetPlayerId) ?? "").trim();
      const targetName =
        targetPlayerId.length === 0
        || resolvedTargetName.length === 0
        || resolvedTargetName === targetPlayerId
          ? "that player"
          : resolvedTargetName;
      return `designated ${targetName} to cut`;
    }
  }
}
