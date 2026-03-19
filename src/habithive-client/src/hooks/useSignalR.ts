import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './useAuth';
import type { ChatMessage, SuggestionStatus } from '../types';

export function useSignalR(
  groupId: string | null,
  onMessage: (msg: ChatMessage) => void,
  onSuggestionUpdated?: (suggestionId: string, status: SuggestionStatus) => void,
) {
  const { token } = useAuth();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!token || !groupId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`/hubs/chat?access_token=${token}`)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.on('ReceiveMessage', (msg: ChatMessage) => {
      onMessage(msg);
    });

    connection.on('SuggestionUpdated', (suggestionId: string, status: SuggestionStatus) => {
      onSuggestionUpdated?.(suggestionId, status);
    });

    connection.start().then(() => {
      connection.invoke('JoinGroup', groupId);
    });

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke('LeaveGroup', groupId).finally(() => connection.stop());
      } else {
        connection.stop();
      }
    };
  }, [token, groupId]);

  const sendMessage = useCallback(
    async (type: number, content: string, referencedHabitId?: string) => {
      if (connectionRef.current?.state === signalR.HubConnectionState.Connected && groupId) {
        await connectionRef.current.invoke('SendMessage', groupId, {
          type,
          content,
          referencedHabitId: referencedHabitId || null,
        });
      }
    },
    [groupId],
  );

  const sendSpecialMessage = useCallback(
    async (template: number, targetHabitId: string, caption?: string) => {
      if (connectionRef.current?.state === signalR.HubConnectionState.Connected && groupId) {
        await connectionRef.current.invoke('SendSpecialMessage', groupId, {
          template,
          targetHabitId,
          caption: caption || null,
        });
      }
    },
    [groupId],
  );

  const sendHabitSuggestion = useCallback(
    async (targetHabitId: string, suggestionType: number, suggestionPayload: string) => {
      if (connectionRef.current?.state === signalR.HubConnectionState.Connected && groupId) {
        await connectionRef.current.invoke('SendHabitSuggestion', groupId, {
          targetHabitId,
          suggestionType,
          suggestionPayload,
        });
      }
    },
    [groupId],
  );

  const respondToSuggestion = useCallback(
    async (suggestionId: string, accepted: boolean) => {
      if (connectionRef.current?.state === signalR.HubConnectionState.Connected && groupId) {
        await connectionRef.current.invoke('RespondToSuggestion', groupId, suggestionId, accepted);
      }
    },
    [groupId],
  );

  return { sendMessage, sendSpecialMessage, sendHabitSuggestion, respondToSuggestion };
}
