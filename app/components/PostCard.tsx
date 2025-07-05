"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getAvatarSrc } from "@/utils/avatar";
import { resolveENS } from "@/utils/ens";
import { isVideoUrl } from "@/utils/media";

interface PostCardProps {
  post: {
    id: string;
    title: string | null;
    summary: string | null;
    media_urls: string[] | null;
    author: string | null;
  };
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const hasMedia = post.media_urls && post.media_urls.length > 0;
  let cover: string | null = null;
  if (hasMedia) {
    const videoUrl = post.media_urls!.find((u) => isVideoUrl(u));
    cover = videoUrl ?? post.media_urls![0];
  }

  const [likesCount, setLikesCount] = useState<number>(0);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    const fetchLikes = async () => {
      const { count } = await supabase
        .from("likes")
        .select("*", { head: true, count: "exact" })
        .eq("post_id", post.id);
      setLikesCount(count ?? 0);
    };
    fetchLikes();
    resolveENS(post.author ?? "").then((name) => {
      if (name) setDisplayName(name);
      else if (post.author)
        setDisplayName(
          `${post.author.substring(0, 6)}…${post.author.slice(-4)}`
        );
    });
  }, [post.id, post.author]);

  return (
    <Link href={`/post/${post.id}`} scroll={false} className="block">
      <div className="break-inside-avoid rounded-xl overflow-hidden shadow-sm hover:shadow-md transition relative bg-white">
        {cover ? (
          <div className="aspect-[3/4] flex items-center justify-center bg-gray-50">
            {isVideoUrl(cover) ? (
              <video
                src={cover}
                autoPlay
                muted
                loop
                playsInline
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <img
                src={cover}
                alt="cover"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        ) : (
          <div className="aspect-[3/4] flex items-center justify-center bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/30 p-4">
            <p className="text-[var(--primary)] font-hand text-2xl font-bold leading-snug text-center line-clamp-5">
              {post.summary ?? post.title ?? "Untitled"}
            </p>
          </div>
        )}
        {/* info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm text-xs px-2 py-1 flex items-center justify-between">
          <span className="flex items-center gap-1 truncate">
            <img
              src={getAvatarSrc(post.author)}
              className="w-4 h-4 rounded-full"
              alt="avatar"
            />
            <span
              className="text-[var(--primary)] truncate max-w-[9rem]"
              title={displayName}
            >
              {displayName || "Anon"}
            </span>
          </span>
          <span className="flex items-center gap-1 text-gray-600">
            <span>❤️</span>
            {likesCount}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default PostCard;
