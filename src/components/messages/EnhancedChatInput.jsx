import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Paperclip, Smile, Send, X } from "lucide-react";
import { toast } from "sonner";

const EMOJI_LIST = ['😀', '😂', '😍', '😊', '🎉', '👍', '❤️', '😭', '🔥', '✨', '😎', '🤔', '👏', '💯', '😴', '😤', '🚀', '💯', '🙏', '😘'];

export default function EnhancedChatInput({ 
  onSendMessage, 
  onAttachImage, 
  replyingTo, 
  onCancelReply,
  disabled 
}) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojis, setShowEmojis] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(recordingTimerRef.current);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          onSendMessage({
            type: 'audio',
            content: '[Audio]',
            audioData: reader.result,
            duration: recordingTime
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      toast.error(t('messages.chatInput.micError'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        onAttachImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    if (message.trim() || previewImage) {
      onSendMessage({
        type: previewImage ? 'image' : 'text',
        content: message,
        imageData: previewImage
      });
      setMessage('');
      setPreviewImage(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2 p-4 border-t border-gray-200 bg-white">
      {/* Respondiendo a */}
      {replyingTo && (
        <div className="flex items-start justify-between gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100 text-sm">
          <div className="flex-1">
            <p className="text-xs text-gray-600 font-medium">{t('messages.chatInput.replyingTo')}</p>
            <p className="text-gray-900 truncate">{replyingTo.content}</p>
          </div>
          <button onClick={onCancelReply} className="flex-shrink-0">
            <X className="w-4 h-4 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
      )}

      {/* Preview de imagen */}
      {previewImage && (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
          <img src={previewImage} alt={t('messages.chatInput.previewAlt')} className="w-full h-full object-cover" />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Grabando */}
      {isRecording && (
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-700">● {formatTime(recordingTime)}</span>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={stopRecording}
            className="ml-auto text-red-600 hover:bg-red-100"
          >
            {t('messages.send')}
          </Button>
        </div>
      )}

      {/* Picker de emojis */}
      {showEmojis && (
        <div className="grid grid-cols-5 gap-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setMessage(message + emoji);
                setShowEmojis(false);
              }}
              className="text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 text-gray-600 hover:bg-gray-100"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isRecording}
          title={t('messages.chatInput.attachImage')}
        >
          <Paperclip className="w-5 h-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 text-gray-600 hover:bg-gray-100"
          onClick={() => setShowEmojis(!showEmojis)}
          disabled={disabled || isRecording}
          title={t('messages.chatInput.emojis')}
        >
          <Smile className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <Input
            placeholder={t('messages.write_message')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || isRecording}
            className="rounded-full border-gray-300"
          />
        </div>

        {!isRecording ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 text-gray-600 hover:bg-gray-100"
              onMouseDown={startRecording}
              onTouchStart={startRecording}
              disabled={disabled}
              title={t('messages.chatInput.holdToRecord')}
            >
              <Mic className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleSend}
              disabled={disabled || (!message.trim() && !previewImage)}
              className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </>
        ) : (
          <Button
            size="icon"
            className="h-10 w-10 bg-red-500 hover:bg-red-600 text-white rounded-full"
            onMouseUp={stopRecording}
            onTouchEnd={stopRecording}
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}