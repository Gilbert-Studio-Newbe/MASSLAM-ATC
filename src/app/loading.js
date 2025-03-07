export default function Loading() {
  return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-green-600 animate-spin"></div>
        <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-b-4 border-green-200 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }}></div>
      </div>
      <p className="ml-4 text-lg font-medium text-gray-700">Loading calculator...</p>
    </div>
  );
}
