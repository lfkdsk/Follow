import {
  AudioPlayer,
  useAudioPlayerAtomSelector,
} from "@renderer/atoms/player"
import { FeedIcon } from "@renderer/components/feed-icon"
import { RelativeTime } from "@renderer/components/ui/datetime"
import { Media } from "@renderer/components/ui/media"
import { FEED_COLLECTION_LIST } from "@renderer/constants"
import { useAsRead } from "@renderer/hooks/biz/useAsRead"
import { useRouteParamsSelector } from "@renderer/hooks/biz/useRouteParams"
import { cn, isSafari } from "@renderer/lib/utils"
import { EntryTranslation } from "@renderer/modules/entry-column/translation"
import { Queries } from "@renderer/queries"
import { useEntry } from "@renderer/store/entry/hooks"
import { useFeedById } from "@renderer/store/feed"
import { useDebounceCallback } from "usehooks-ts"

import { ReactVirtuosoItemPlaceholder } from "../../../components/ui/placeholder"
import { StarIcon } from "../star-icon"
import type { UniversalItemProps } from "../types"

export function ListItem({
  entryId,
  entryPreview,
  translation,
  withDetails,
  withAudio,
}: UniversalItemProps & {
  withDetails?: boolean
  withAudio?: boolean
}) {
  const entry = useEntry(entryId) || entryPreview

  const asRead = useAsRead(entry)

  const inInCollection = useRouteParamsSelector(
    (s) => s.feedId === FEED_COLLECTION_LIST,
  )

  const feed = useFeedById(entry?.feedId) || entryPreview?.feeds

  const handlePrefetchEntry = useDebounceCallback(
    () => {
      Queries.entries.byId(entryId).prefetch()
    },
    300,
    { leading: false },
  )

  // NOTE: prevent 0 height element, react virtuoso will not stop render any more
  if (!entry || !feed) return <ReactVirtuosoItemPlaceholder />

  const displayTime = inInCollection ?
    entry.collections?.createdAt :
    entry.entries.publishedAt
  const envIsSafari = isSafari()
  return (
    <div
      onMouseEnter={handlePrefetchEntry}
      onMouseLeave={handlePrefetchEntry.cancel}
      className={cn(
        "group relative flex py-4 pl-3 pr-2",
        !asRead &&
        "before:absolute before:-left-0.5 before:top-[1.4375rem] before:block before:size-2 before:rounded-full before:bg-accent",
      )}
    >
      {!withAudio && <FeedIcon feed={feed} fallback entry={entry.entries} />}
      <div
        className={cn(
          "-mt-0.5 flex-1 text-sm leading-tight",

          // FIXME: Safari bug, not support line-clamp cross elements
          !envIsSafari && "line-clamp-4",
        )}
      >
        <div
          className={cn(
            "flex gap-1 text-[10px] font-bold",
            asRead ?
              "text-zinc-400 dark:text-neutral-500" :
              "text-zinc-500 dark:text-zinc-400",
            entry.collections && "text-zinc-600 dark:text-zinc-500",
          )}
        >
          <span className="truncate">{feed.title}</span>
          <span>·</span>
          <span className="shrink-0">
            {!!displayTime && <RelativeTime date={displayTime} />}
          </span>
        </div>
        <div
          className={cn(
            "relative my-0.5 break-words",
            !!entry.collections && "pr-5",
            entry.entries.title ?
                (withDetails || withAudio) && "font-medium" :
              "text-[13px]",
          )}
        >
          {entry.entries.title ? (
            <EntryTranslation
              className={envIsSafari ? "line-clamp-2 break-all" : undefined}
              source={entry.entries.title}
              target={translation?.title}
            />
          ) : (
            <EntryTranslation
              source={entry.entries.description}
              target={translation?.description}
            />
          )}
          {!!entry.collections && <StarIcon />}
        </div>
        {withDetails && (
          <div
            className={cn(
              "text-[13px]",
              asRead ?
                "text-zinc-400 dark:text-neutral-500" :
                "text-zinc-500 dark:text-neutral-400",
            )}
          >
            <EntryTranslation
              className={envIsSafari ? "line-clamp-2 break-all" : undefined}
              source={entry.entries.description}
              target={translation?.description}
            />
          </div>
        )}
      </div>

      {withAudio && entry.entries?.attachments?.[0].url && (
        <AudioCover
          entryId={entryId}
          src={entry.entries?.attachments?.[0].url}
          durationInSeconds={Number.parseInt(
            String(entry.entries?.attachments?.[0].duration_in_seconds ?? 0),
            10,
          )}
          feedIcon={(
            <FeedIcon
              fallback={false}
              feed={feed}
              entry={entry.entries}
              size={80}
              className="m-0 rounded"
            />
          )}
        />
      )}

      {withDetails && entry.entries.media?.[0] && (
        <Media
          src={entry.entries.media[0].url}
          type={entry.entries.media[0].type}
          previewImageUrl={entry.entries.media[0].preview_image_url}
          className="ml-2 size-20 shrink-0"
          loading="lazy"
          proxy={{
            width: 160,
            height: 160,
          }}
        />
      )}
    </div>
  )
}

function AudioCover({
  entryId,
  src,
  durationInSeconds,
  feedIcon,
}: {
  entryId: string
  src: string
  durationInSeconds?: number
  feedIcon: React.ReactNode
}) {
  const playStatus = useAudioPlayerAtomSelector((playerValue) =>
    playerValue.src === src && playerValue.show ? playerValue.status : false,
  )

  const estimatedMins = durationInSeconds ?
    Math.floor(durationInSeconds / 60) :
    undefined

  const handleClickPlay = () => {
    if (!playStatus) {
      // switch this to play
      AudioPlayer.mount({
        type: "audio",
        entryId,
        src,
        currentTime: 0,
      })
    } else {
      // switch between play and pause
      AudioPlayer.togglePlayAndPause()
    }
  }

  return (
    <div className="relative ml-2 shrink-0">
      {feedIcon}

      <div
        className={cn(
          "center absolute inset-0 w-full transition-all duration-200 ease-in-out group-hover:opacity-100",
          playStatus ? "opacity-100" : "opacity-0",
        )}
        onClick={handleClickPlay}
      >
        <button
          type="button"
          className="center size-10 rounded-full bg-theme-background opacity-95 hover:bg-accent hover:text-white hover:opacity-100"
        >
          <i
            className={cn("size-6", {
              "i-mingcute-pause-fill": playStatus && playStatus === "playing",
              "i-mingcute-loading-fill animate-spin":
                playStatus && playStatus === "loading",
              "i-mingcute-play-fill": !playStatus || playStatus === "paused",
            })}
          />
        </button>
      </div>

      {!!estimatedMins && (
        <div className="absolute bottom-0 w-full rounded-b-sm bg-white/50 text-center text-[13px] opacity-0 backdrop-blur duration-100 group-hover:opacity-100 dark:bg-neutral-900/70">
          {formatEstimatedMins(estimatedMins)}
        </div>
      )}
    </div>
  )
}
const formatEstimatedMins = (estimatedMins: number) => {
  const minutesInHour = 60
  const minutesInDay = minutesInHour * 24
  const minutesInMonth = minutesInDay * 30

  const months = Math.floor(estimatedMins / minutesInMonth)
  const days = Math.floor((estimatedMins % minutesInMonth) / minutesInDay)
  const hours = Math.floor((estimatedMins % minutesInDay) / minutesInHour)
  const minutes = estimatedMins % minutesInHour

  if (months > 0) {
    return `${months}M ${days}d`
  }
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${estimatedMins} mins`
}
