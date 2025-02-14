import { apiClient } from "@renderer/lib/api-fetch"
import { defineQuery } from "@renderer/lib/defineQuery"
import type { FeedViewType } from "@renderer/lib/enum"
import { subscriptionActions } from "@renderer/store/subscription"
import { feedUnreadActions } from "@renderer/store/unread"

export const subscription = {
  byView: (view?: FeedViewType) =>
    defineQuery(["subscriptions", view], async () => subscriptionActions.fetchByView(view), {
      rootKey: ["subscriptions"],
    }),
  categories: (view?: number) =>
    defineQuery(["subscription-categories", view], async () => {
      const res = await apiClient.categories.$get({
        query: { view: String(view) },
      })

      return res.data
    }),

  unreadAll: () => defineQuery(["unread-all"], async () => feedUnreadActions.fetchUnreadAll()),
}
