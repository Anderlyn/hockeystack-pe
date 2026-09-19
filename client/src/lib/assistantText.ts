import type { SSEEvent } from "../../../shared/events";

const sanitizeAssistantText = (text: string): string =>
    text
        .replace(
            /(?:Rendered|Created|Built)\s+(?:a|an)\s+\w+(?:\s+\w+)*\s+chart\b[^.!?\n]*(?:from\s+)?res_[\w-]+\.?/gi,
            "",
        )
        .replace(/\s*\(x=[^)\n]+,\s*y=[^)\n]+\)/gi, "")
        .replace(
            /(?:result_id|bytes_scanned|columns|total_rows)\s*:\s*[^\n]*/gi,
            "",
        )
        .replace(/\bres_[\w-]+\b/gi, "")
        .replace(/\s+\./g, ".")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

const visualText = (text: string, hasVisual: boolean): string => {
    const sanitized = sanitizeAssistantText(text);
    if (
        !hasVisual &&
        !sanitized.includes("|") &&
        !/(?:here(?:'s| is)|this is)\s+(?:the\s+)?(?:table|chart)\b/i.test(
            sanitized,
        )
    ) {
        return sanitized;
    }
    return sanitized
        .split(/\n+/)
        .filter((line) => {
            const normalized = line.trim().toLowerCase();
            return (
                !line.includes("|") &&
                !/(?:here(?:'s| is)|this is)\s+(?:the\s+)?(?:table|chart)\b/.test(
                    normalized,
                )
            );
        })
        .join("\n")
        .trim();
};

const mergeText = (segments: string[]): string => {
    const merged: string[] = [];
    for (const segment of segments) {
        const value = segment.trim();
        if (!value) continue;
        const previous = merged[merged.length - 1];
        if (!previous || previous === value || previous.includes(value)) {
            if (!previous) merged.push(value);
            continue;
        }
        if (value.includes(previous)) {
            merged[merged.length - 1] = value;
            continue;
        }
        merged.push(value);
    }
    return merged.join("\n\n");
};

const assistantSegments = (events: SSEEvent[]): string[] => {
    const segments: string[] = [];
    let current = "";
    for (const event of events) {
        if (event.type === "assistant_delta") {
            current += event.text;
        } else if (current) {
            segments.push(current);
            current = "";
        }
    }
    if (current) segments.push(current);
    return segments;
};

export const assistantDisplayText = (
    events: SSEEvent[],
    hasVisual: boolean,
): string => visualText(mergeText(assistantSegments(events)), hasVisual);
