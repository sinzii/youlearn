interface VideoPlayerProps {
  videoId: string;
  title: string;
}

export default function VideoPlayer({ videoId, title }: VideoPlayerProps) {
  return (
    <div className="rounded-lg overflow-hidden bg-black">
      {/* 16:9 Aspect Ratio Container */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {/* Video Title */}
      <div className="px-3 py-2 bg-zinc-900">
        <h2 className="text-sm font-medium text-white line-clamp-2">
          {title}
        </h2>
      </div>
    </div>
  );
}
