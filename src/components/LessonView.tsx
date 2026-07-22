export function LessonView({ src, title }: { src: string; title: string }) {
  return (
    <div className="flex h-full flex-col">
      <iframe
        title={title}
        src={src}
        className="h-full w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}
