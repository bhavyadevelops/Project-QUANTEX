import React from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useLanguage } from "@/lib/i18n";
import { SPEECH_LANG } from "@/lib/i18n";

interface MicButtonProps {
  onTranscript: (text: string) => void;
  append?: boolean;
  className?: string;
  size?: "sm" | "default" | "icon";
}

export function MicButton({ onTranscript, append = true, className, size = "icon" }: MicButtonProps) {
  const { lang, t } = useLanguage();
  const speechLang = SPEECH_LANG[lang] ?? "en-US";

  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    lang: speechLang,
    onResult: onTranscript,
  });

  if (!isSupported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size={size} disabled className={className}>
            <MicOff className="w-4 h-4 text-muted-foreground/40" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("mic_unsupported")}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isListening ? "destructive" : "ghost"}
          size={size}
          onClick={isListening ? stopListening : startListening}
          className={`transition-all ${isListening ? "animate-pulse" : ""} ${className ?? ""}`}
          aria-label={isListening ? t("mic_listening") : "Voice input"}
        >
          {isListening ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4 text-primary" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isListening ? t("mic_listening") : `Voice Input (${lang.toUpperCase()})`}
      </TooltipContent>
    </Tooltip>
  );
}
