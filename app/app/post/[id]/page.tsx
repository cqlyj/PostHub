"use client";
import React, {
  useEffect,
  useState,
  use as reactUse,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { usePrivy } from "@privy-io/react-auth";
import { getAvatarSrc } from "@/utils/avatar";
import { getDisplayName } from "@/utils/displayName";
import { ethers } from "ethers";
import GiftModal from "@/components/GiftModal";
import GiftAnimationOverlay, {
  GiftOption as GiftOptionType,
} from "@/components/GiftAnimationOverlay";
import { isVideoUrl, extractSamsungMotionPhoto } from "@/utils/media";
import { sendNotification } from "@/utils/notifications";
import PoapBadgeForAddress from "@/components/PoapBadgeForAddress";

type GiftOption = GiftOptionType;

const GIFT_OPTIONS: GiftOption[] = [
  { amount: 1, emoji: "🌸", name: "Flower", description: "Light Thanks" },
  { amount: 3, emoji: "🎉", name: "Confetti", description: "Applause" },
  { amount: 5, emoji: "🚗", name: "Car", description: "Fan Love" },
  { amount: 10, emoji: "🚀", name: "Rocket", description: "Superfan" },
];

const PostDetail = ({ params }: { params: Promise<{ id: string }> }) => {
  // unwrap params promise (Next.js 14)
  const { id } = reactUse(params);
  const router = useRouter();
  const { user } = usePrivy();

  interface Post {
    id: string;
    author: string;
    title: string;
    content: string;
    created_at: string;
    media_urls: string[];
    is_restricted: boolean;
    summary?: string;
    tx_hash?: string | null;
  }
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorDisplayName, setAuthorDisplayName] = useState<string>("");
  type Comment = {
    id: string;
    author: string;
    content: string;
    created_at: string;
    parent_comment_id: string | null;
    likes: number;
    liked: boolean;
    displayName: string;
  };

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);

  // interaction states
  const [likesCount, setLikesCount] = useState(0);
  const [starsCount, setStarsCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [starred, setStarred] = useState(false);
  const [txConfirmed, setTxConfirmed] = useState<boolean | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [animData, setAnimData] = useState<{
    option: GiftOption;
    txHash: string;
    visible: boolean;
    confirmed: boolean;
  } | null>(null);

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "post-media";
  const COMMENT_MAX_MEDIA = 3;
  const FLOW_RPC =
    process.env.NEXT_PUBLIC_FLOW_EVM_RPC_URL ||
    "https://mainnet.evm.nodes.onflow.org";

  const fetchComments = async () => {
    const { data: commentRows } = await supabase
      .from("comments")
      .select("id,author,content,created_at,parent_comment_id")
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    if (!commentRows) return;

    const enriched: Comment[] = await Promise.all(
      commentRows.map(async (c) => {
        const { count: likeCnt } = await supabase
          .from("comment_likes")
          .select("*", { head: true, count: "exact" })
          .eq("comment_id", c.id);

        let userLiked = false;
        if (user?.wallet?.address) {
          const { data: likeRow } = await supabase
            .from("comment_likes")
            .select("comment_id")
            .eq("comment_id", c.id)
            .eq("user_address", user.wallet.address)
            .maybeSingle();
          userLiked = !!likeRow;
        }
        const displayName = await getDisplayName(c.author);
        return {
          ...c,
          likes: likeCnt ?? 0,
          liked: userLiked,
          displayName,
        } as Comment;
      })
    );
    setComments(enriched);
  };

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();
      if (!error) {
        setPost(data);
        getDisplayName(data.author).then((name) => setAuthorDisplayName(name));
      }
      await fetchComments();
      setLoading(false);
    };
    fetch();
  }, [id, user?.wallet?.address]);

  // Monitor transaction confirmation
  useEffect(() => {
    if (!post?.tx_hash) return;

    const provider = new ethers.JsonRpcProvider(FLOW_RPC);

    let cancelled = false;

    const check = async () => {
      try {
        const receipt = await provider.getTransactionReceipt(post.tx_hash!);
        if (receipt && receipt.blockNumber) {
          if (!cancelled) setTxConfirmed(true);
        } else {
          if (!cancelled) setTxConfirmed(false);
          setTimeout(check, 8000);
        }
      } catch (err) {
        console.error("Receipt error", err);
        if (!cancelled) setTimeout(check, 8000);
      }
    };

    // initial check
    check();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.tx_hash]);

  // fetch likes / stars counts & user states
  useEffect(() => {
    const fetchInteraction = async () => {
      const { count: likeCnt } = await supabase
        .from("likes")
        .select("*", { head: true, count: "exact" })
        .eq("post_id", id);
      setLikesCount(likeCnt ?? 0);

      const { count: starCnt } = await supabase
        .from("stars")
        .select("*", { head: true, count: "exact" })
        .eq("post_id", id);
      setStarsCount(starCnt ?? 0);

      if (user?.wallet?.address) {
        const { data: likeRow } = await supabase
          .from("likes")
          .select("post_id")
          .eq("post_id", id)
          .eq("user_address", user.wallet.address)
          .maybeSingle();
        setLiked(!!likeRow);

        const { data: starRow } = await supabase
          .from("stars")
          .select("post_id")
          .eq("post_id", id)
          .eq("user_address", user.wallet.address)
          .maybeSingle();
        setStarred(!!starRow);
      }
    };
    fetchInteraction();
  }, [id, user?.wallet?.address]);

  const toggleLike = async () => {
    if (!user?.wallet?.address) return;
    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", id)
        .eq("user_address", user.wallet.address);
      setLiked(false);
      setLikesCount((c) => c - 1);
    } else {
      await supabase.from("likes").upsert({
        post_id: id,
        user_address: user.wallet.address,
      });
      setLiked(true);
      setLikesCount((c) => c + 1);
      if (post?.author && user?.wallet?.address)
        sendNotification({
          recipient: post.author,
          actor: user.wallet.address,
          postId: id,
          type: "like",
        });
    }
  };

  const toggleStar = async () => {
    if (!user?.wallet?.address) return;
    if (starred) {
      await supabase
        .from("stars")
        .delete()
        .eq("post_id", id)
        .eq("user_address", user.wallet.address);
      setStarred(false);
      setStarsCount((c) => c - 1);
    } else {
      await supabase.from("stars").upsert({
        post_id: id,
        user_address: user.wallet.address,
      });
      setStarred(true);
      setStarsCount((c) => c + 1);
      if (post?.author && user?.wallet?.address)
        sendNotification({
          recipient: post.author,
          actor: user.wallet.address,
          postId: id,
          type: "star",
        });
    }
  };

  const handleGiftSelect = async (option: GiftOption) => {
    setGiftOpen(false);
    if (!user?.wallet?.address) {
      alert("Connect your wallet to send gifts");
      return;
    }

    if (!post) return; // safeguard

    try {
      // Browser provider from injected wallet (e.g., Metamask or Privy embedded)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ethProvider = (window as any).ethereum;
      if (!ethProvider) {
        alert("Ethereum provider not found");
        return;
      }

      const provider = new ethers.BrowserProvider(ethProvider);
      const signer = await provider.getSigner();

      // USDC ERC-20 contract (mock)
      const USDC_ADDRESS =
        process.env.NEXT_PUBLIC_USDC_ADDRESS ||
        "0xa7FbcaAD0D4c2e8188b386B7C3951E1e0792Bf8E"; // fallback

      const ERC20_ABI = [
        "function decimals() view returns (uint8)",
        "function transfer(address to, uint256 amount) returns (bool)",
      ];

      const token = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

      // Determine token decimals (USDC mock likely 6)
      let decimals = 6;
      try {
        decimals = await token.decimals();
      } catch {
        /* ignore, use default */
      }

      const amount = ethers.parseUnits(option.amount.toString(), decimals);

      const recipient = post!.author; // non-null assertion after earlier guard
      const tx = await token.transfer(recipient, amount);

      // open animation overlay
      setAnimData({ option, txHash: tx.hash, visible: true, confirmed: false });
      if (user?.wallet?.address)
        sendNotification({
          recipient,
          actor: user.wallet.address,
          postId: id,
          type: "gift_received",
        });

      // wait for confirmation in background
      provider
        .waitForTransaction(tx.hash)
        .then(() => {
          setAnimData((d) => {
            if (d && d.txHash === tx.hash) {
              const updated = { ...d, confirmed: true };
              if (!updated.visible) {
                alert(`Gift confirmed! Tx: ${tx.hash.substring(0, 10)}…`);
              }
              return updated;
            }
            return d;
          });
        })
        .catch((err) => console.error("Wait tx error", err));

      // No local notification; recipient will be notified through realtime update
    } catch (err) {
      console.error("Gift send failed", err);
      alert("Failed to send gift: " + (err as Error).message);
    }
  };

  const toggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!user?.wallet?.address) return;
      const address = user.wallet.address;

      // Find the target comment to know current state
      const target = comments.find((c) => c.id === commentId);
      if (!target) return;

      if (target.liked) {
        // Unlike
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_address", address);
      } else {
        // Like
        await supabase.from("comment_likes").upsert({
          comment_id: commentId,
          user_address: address,
        });
        // Notify comment author
        const targetAuthor = target.author;
        if (user?.wallet?.address && targetAuthor !== user.wallet.address) {
          sendNotification({
            recipient: targetAuthor,
            actor: user.wallet.address,
            postId: id,
            commentId,
            type: "comment_like",
          });
        }
      }

      // Refresh the list so counts persist correctly across reloads
      fetchComments();
    },
    [user, comments, id]
  );

  const handleReply = useCallback((comment: Comment) => {
    setReplyTo(comment);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length + commentFiles.length > COMMENT_MAX_MEDIA) {
      alert(`You can attach up to ${COMMENT_MAX_MEDIA} images.`);
      return;
    }
    setCommentFiles([...commentFiles, ...selected]);
    e.target.value = ""; // reset
  };

  // helper: render comments recursively (defined before JSX return for hoisting)
  const renderComments = (
    parentId: string | null,
    depth: number
  ): React.ReactNode[] => {
    return comments
      .filter((c) => c.parent_comment_id === parentId)
      .map((c) => (
        <div
          key={c.id}
          id={`comment-${c.id}`}
          className="border-b pb-2"
          style={{ marginLeft: depth * 16 }}
        >
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <img
              src={getAvatarSrc(c.author)}
              className="w-4 h-4 rounded-full"
              alt="avatar"
            />
            {c.displayName} <PoapBadgeForAddress address={c.author} size={12} />{" "}
            • {new Date(c.created_at).toLocaleString()}
          </p>
          <div className="text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ ...props }) => (
                  <img
                    {...props}
                    className="w-24 h-24 object-cover rounded mr-1 mb-1 inline-block"
                  />
                ),
              }}
            >
              {c.content}
            </ReactMarkdown>
          </div>
          {/* like & reply */}
          <div className="flex items-center gap-4 text-sm mt-1">
            <button
              onClick={() => toggleCommentLike(c.id)}
              className="flex items-center gap-1"
            >
              <span>{c.liked ? "❤️" : "🤍"}</span>
              <span>{c.likes}</span>
            </button>
            <button
              onClick={() => handleReply(c)}
              className="text-[var(--primary)]"
            >
              Reply
            </button>
          </div>
          {/* render children */}
          {renderComments(c.id, depth + 1)}
        </div>
      ));
  };

  if (loading) return <p className="p-4">Loading...</p>;
  if (!post) return <p className="p-4">Post not found</p>;

  const handleSend = async () => {
    if (!commentInput.trim() && commentFiles.length === 0) return;
    const author = user?.wallet?.address ?? "Anonymous";

    // upload images first
    const mediaUrls: string[] = [];
    for (const file of commentFiles) {
      const blobs: { blob: Blob | File; ext: string; type: string }[] = [];
      if (file.type === "image/jpeg") {
        const videoBlob = await extractSamsungMotionPhoto(file);
        if (videoBlob)
          blobs.push({ blob: videoBlob, ext: "mp4", type: "video/mp4" });
      }
      blobs.push({
        blob: file,
        ext: file.name.split(".").pop() || "",
        type: file.type,
      });

      for (const { blob, ext, type } of blobs) {
        const filePath = `${author}/${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(filePath, blob, {
            upsert: false,
            contentType: type,
          });
        if (uploadErr) {
          alert("Failed to upload image");
          return;
        }
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        mediaUrls.push(urlData.publicUrl);
      }
    }

    let finalContent = commentInput.trim();
    for (const url of mediaUrls) {
      finalContent += `\n\n![image](${url})`;
    }

    const { data: inserted, error } = await supabase
      .from("comments")
      .insert({
        post_id: id,
        author,
        content: finalContent,
        parent_comment_id: replyTo?.id ?? null,
      })
      .select("id")
      .single();
    if (!error && inserted) {
      setCommentInput("");
      setCommentFiles([]);
      setReplyTo(null);
      fetchComments();
      // Notify appropriate recipient
      if (user?.wallet?.address) {
        if (replyTo) {
          sendNotification({
            recipient: replyTo.author,
            actor: user.wallet.address,
            postId: id,
            type: "reply",
            commentId: inserted.id,
          });
        } else if (post?.author) {
          sendNotification({
            recipient: post.author,
            actor: user.wallet.address,
            postId: id,
            type: "comment",
          });
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 bg-white shadow px-4 py-2 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="text-[var(--primary)] text-lg"
        >
          ←
        </button>
        <div className="flex items-center gap-2 truncate">
          <img
            src={getAvatarSrc(post.author)}
            className="w-6 h-6 rounded-full"
            alt="avatar"
          />
          <h1 className="font-bold text-[var(--primary)] truncate">
            {authorDisplayName}
          </h1>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        {/* media carousel simple */}
        {post.media_urls && post.media_urls.length > 0 ? (
          <div className="w-full bg-white flex overflow-x-auto snap-x snap-mandatory rounded-b-xl">
            {post.media_urls.map((url: string, idx: number) => (
              <div
                key={idx}
                className="snap-center flex-shrink-0 w-full flex items-center justify-center bg-white aspect-[3/4]"
              >
                {isVideoUrl(url) ? (
                  <video
                    src={url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <img
                    src={url}
                    className="max-w-full max-h-full object-contain"
                    alt="media"
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full flex items-center justify-center bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/20 aspect-[3/4] rounded-b-xl p-6">
            <p className="font-hand text-3xl font-bold text-[var(--primary)] leading-snug text-center">
              {post.summary ?? post.title}
            </p>
          </div>
        )}
        <div className="px-4 py-2 text-sm text-gray-500 space-y-1">
          <div>{new Date(post.created_at).toLocaleString()}</div>
          {post.tx_hash && (
            <div>
              {txConfirmed === false && (
                <span className="mr-2 text-yellow-600">Pending…</span>
              )}
              {txConfirmed && (
                <span className="mr-2 text-green-600">Confirmed</span>
              )}
              <a
                href={`https://evm.flowscan.io/tx/${post.tx_hash}`}
                target="_blank"
                rel="noreferrer"
                className="underline text-[var(--primary)]"
              >
                {post.tx_hash.substring(0, 10)}…
              </a>
            </div>
          )}
        </div>

        {/* likes / stars / gift */}
        <div className="px-4 py-2 flex items-center gap-6 text-lg">
          <button onClick={toggleLike} className="flex items-center gap-1">
            <span>{liked ? "❤️" : "🤍"}</span>
            <span className="text-sm">{likesCount}</span>
          </button>
          <button onClick={toggleStar} className="flex items-center gap-1">
            <span>{starred ? "⭐" : "☆"}</span>
            <span className="text-sm">{starsCount}</span>
          </button>
          {!post.is_restricted && (
            <button onClick={() => setGiftOpen(true)} className="ml-auto">
              🎁
            </button>
          )}
        </div>
        <div className="prose p-4 max-w-none">
          <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>
      </main>
      <hr className="my-4 border-t" />
      <section className="px-4 pb-40">
        {/* space for bottom bar */}

        <h2 className="font-semibold mb-2 text-sm">
          Comments ({comments.length})
        </h2>
        {comments.length === 0 && (
          <p className="text-sm text-gray-400">No comments yet</p>
        )}

        {/* recursive comment renderer */}
        <div className="space-y-3">{renderComments(null, 0)}</div>
      </section>

      {/* unified bottom composer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-inner flex flex-col">
        {/* reply banner */}
        {replyTo && (
          <div className="flex justify-between items-center px-4 py-1 text-xs bg-[var(--primary)]/10">
            <span>Replying to {replyTo.displayName}</span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-[var(--primary)] font-semibold"
            >
              Cancel
            </button>
          </div>
        )}

        {/* attached image previews */}
        {commentFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 py-2 border-t">
            {commentFiles.map((file, idx) => (
              <img
                key={idx}
                src={URL.createObjectURL(file)}
                className="w-16 h-16 object-cover rounded"
              />
            ))}
          </div>
        )}

        {/* input bar */}
        <div className="flex items-center px-4 py-2 gap-2 border-t">
          <input
            type="text"
            placeholder={replyTo ? "Reply…" : "Say something…"}
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            className="flex-1 border rounded-full px-3 py-1 text-sm focus:outline-none"
          />
          {/* attach image */}
          <label
            className="cursor-pointer text-xl"
            htmlFor="comment-file-input"
          >
            📷
          </label>
          <input
            id="comment-file-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={handleSend}
            className="bg-[var(--primary)] text-white px-4 py-1 rounded-full disabled:opacity-50"
            disabled={!commentInput.trim() && commentFiles.length === 0}
          >
            Send
          </button>
        </div>
      </div>
      {giftOpen && (
        <GiftModal
          options={GIFT_OPTIONS}
          onClose={() => setGiftOpen(false)}
          onSelect={handleGiftSelect}
        />
      )}

      {animData && animData.visible && (
        <GiftAnimationOverlay
          option={animData.option}
          txHash={animData.txHash}
          confirmed={animData.confirmed}
          onClose={() => setAnimData({ ...animData, visible: false })}
        />
      )}
    </div>
  );
};

export default PostDetail;
