import {
  connectedProviderName,
  type ConnectedAccount,
} from "@/lib/connectors/connected-accounts";
import {
  listUpcomingEvents,
  mapEventToExecutiveBriefInput,
} from "@/lib/connectors/calendar/nylas/events";
import { listRecentMessages } from "@/lib/connectors/email/nylas/messages";
import { syncNylasMessagesToSupabase } from "@/lib/connectors/email/sync";
import type { SupabaseClient } from "@supabase/supabase-js";

const SYNC_MESSAGE_LIMIT = 50;
const SYNC_EVENT_LIMIT = 50;

export async function syncConnectedAccounts(
  supabase: SupabaseClient,
  accounts: ConnectedAccount[],
) {
  const summaries: string[] = [];
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      const [messageResult, events] = await Promise.all([
        listRecentMessages(account.grantId, SYNC_MESSAGE_LIMIT),
        listUpcomingEvents(account.grantId, { limit: SYNC_EVENT_LIMIT }),
      ]);
      const { messages, spamMessageIds } = messageResult;
      const calendarItems = events.map(mapEventToExecutiveBriefInput);

      if (spamMessageIds.length > 0) {
        const { error } = await supabase
          .from("executive_briefs")
          .delete()
          .eq("source_grant_id", account.grantId)
          .in("source_message_id", spamMessageIds);
        if (error) throw new Error(`Unable to remove spam briefs: ${error.message}`);
      }
      const result = await syncNylasMessagesToSupabase(
        supabase,
        [...messages, ...calendarItems],
        {
          provider: account.provider,
          account: account.email,
          grantId: account.grantId,
        },
      );

      summaries.push(
        `${connectedProviderName(account.provider)}: ${messages.length} email(s), ${calendarItems.length} event(s), ${result.analyzed} AI-analyzed`,
      );
      if (result.analysisFailed > 0) {
        errors.push(
          `${connectedProviderName(account.provider)}: ${result.analysisFailed} AI analysis attempt(s) failed.`,
        );
      }
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : `Unable to synchronize ${connectedProviderName(account.provider)}.`,
      );
    }
  }

  return { summaries, errors };
}
