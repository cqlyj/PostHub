"use client";
import React, { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import TopSearchBar from "@/components/TopSearchBar";
import BottomNav from "@/components/BottomNav";

import { ethers } from "ethers";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { extractSamsungMotionPhoto } from "@/utils/media";
// On-chain constants to fetch user type for tags
const CONTRACT_ADDRESS = "0xbd0Efe0890B8107fDa1495754ccb25FdbCCcE2aF";
const CELO_TESTNET_RPC = "https://alfajores-forno.celo-testnet.org";
const ABI = ["function s_userType(address) view returns (uint8)"];
const LABELS = [
  "RESTRICTED_MINOR_MALE",
  "RESTRICTED_MINOR_FEMALE",
  "RESTRICTED_ADULT_MALE",
  "RESTRICTED_ADULT_FEMALE",
  "RESTRICTED_SENIOR_MALE",
  "RESTRICTED_SENIOR_FEMALE",
  "MINOR_MALE",
  "MINOR_FEMALE",
  "ADULT_MALE",
  "ADULT_FEMALE",
  "SENIOR_MALE",
  "SENIOR_FEMALE",
];

const MAX_MEDIA = 9;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "post-media"; // env override

const CreatePostPage = () => {
  const { user } = usePrivy();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length + files.length > MAX_MEDIA) {
      alert(`You can upload up to ${MAX_MEDIA} images.`);
      return;
    }
    setFiles([...files, ...selected]);
  };

  // drag drop support
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length + files.length > MAX_MEDIA) {
        alert(`You can upload up to ${MAX_MEDIA} images.`);
        return;
      }
      setFiles([...files, ...dropped]);
    },
    [files]
  );

  const preventDefault = (e: React.DragEvent) => e.preventDefault();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.wallet?.address) {
      setError("You must be connected");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // derive summary first 100 words
      const summary = content.split(/\s+/).slice(0, 100).join(" ");

      // fetch user type tags
      let gender = "unknown";
      let ageGroup = "adult";
      let isRestricted = false;
      try {
        const provider = new ethers.JsonRpcProvider(CELO_TESTNET_RPC);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        const idx: number = Number(
          await contract.s_userType(user.wallet.address)
        );
        const label: string = LABELS[idx] ?? "UNKNOWN";
        isRestricted = idx < 6; // first 6 are restricted
        if (label.includes("MALE")) gender = "male";
        else if (label.includes("FEMALE")) gender = "female";
        if (label.includes("MINOR")) ageGroup = "minor";
        else if (label.includes("SENIOR")) ageGroup = "senior";
        else ageGroup = "adult";
      } catch (tagErr) {
        console.warn("Failed to fetch user type", tagErr);
      }

      // declare variable to hold inserted row id for later updates
      let insertedId: string | null = null;

      // upload media
      const mediaUrls: string[] = [];
      for (const file of files) {
        // Check if the jpeg contains an embedded motion-photo video
        const extraBlobs: { blob: Blob | File; ext: string; type: string }[] =
          [];
        if (file.type === "image/jpeg") {
          const videoBlob = await extractSamsungMotionPhoto(file);
          if (videoBlob) {
            extraBlobs.push({ blob: videoBlob, ext: "mp4", type: "video/mp4" });
          }
        }

        // The image / original file is pushed last so video shows first in carousel
        extraBlobs.push({
          blob: file,
          ext: file.name.split(".").pop() || "",
          type: file.type,
        });

        for (const { blob, ext, type } of extraBlobs) {
          const filePath = `${user.wallet.address}/${Date.now()}-${Math.random()
            .toString(36)
            .substring(2)}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(filePath, blob, {
              upsert: false,
              contentType: type,
            });
          if (uploadErr) throw uploadErr;
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          mediaUrls.push(urlData.publicUrl);
        }
      }

      // 2. Insert post off-chain immediately
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postRow: Record<string, any> = {
        author: user.wallet.address,
        title,
        summary,
        content,
        media_urls: mediaUrls,
        gender,
        age_group: ageGroup,
        is_restricted: isRestricted,
        tx_hash: null, // will be filled in background
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("posts")
        .insert(postRow)
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      insertedId = inserted.id;

      // 3. Now fire on-chain tx in background
      let txHash: string | null = null;
      fetch("/api/createOnchain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: user.wallet.address,
          title,
          summary,
          mediaLinks: mediaUrls,
        }),
      })
        .then(async (r) => {
          if (r.ok) {
            const data = await r.json();
            txHash = data.hash as string;
            // best-effort: patch the post row with tx_hash after insert
            await supabase
              .from("posts")
              .update({ tx_hash: txHash })
              .eq("id", insertedId!);
          } else {
            console.error("Failed to create post on-chain", await r.text());
          }
        })
        .catch((ocErr) => console.error("On-chain request error", ocErr));

      // 4. Jump to the new post detail page instantly
      router.push(`/post/${insertedId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create post";
      console.error(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--muted-bg)]">
      <TopSearchBar />
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-[var(--primary)] mb-2">
          New Post
        </h1>
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-white shadow p-4 rounded-lg"
        >
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          {/* editor / preview tabs */}
          <div>
            <div className="flex mb-2 border-b">
              <button
                type="button"
                onClick={() => setPreviewMode("edit")}
                className={`px-3 py-1 text-sm font-medium border-b-2 ${
                  previewMode === "edit"
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-transparent text-gray-500"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("preview")}
                className={`px-3 py-1 text-sm font-medium border-b-2 ${
                  previewMode === "preview"
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-transparent text-gray-500"
                }`}
              >
                Preview
              </button>
            </div>
            {previewMode === "edit" ? (
              <textarea
                placeholder="Write your post in markdown..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            ) : (
              <div className="prose max-w-none border rounded p-3 bg-gray-50 overflow-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={preventDefault}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer"
          >
            <label className="text-sm text-gray-600">
              Drag & drop media here or click to browse
              <input
                type="file"
                accept="image/*,video/*,livephoto/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {files.map((f, idx) => (
                  <div
                    key={idx}
                    className="aspect-square bg-gray-100 text-xs flex items-center justify-center overflow-hidden rounded relative"
                  >
                    {f.type.startsWith("image") ? (
                      <img
                        src={URL.createObjectURL(f)}
                        alt="preview"
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="p-1">{f.name}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--primary)] text-white py-2 rounded font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "Publishing..." : "Publish"}
          </button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
};

export default CreatePostPage;
