export function Leaderboard() {
  return (
    <div>
      <h3 className="font-bold text-lg mb-3">LEADERBOARD</h3>
      <div className="overflow-y-auto max-h-[300px]">
        <div className="grid grid-cols-[7%_1fr_1fr_1fr] gap-4 text-sm font-medium border-b pb-2 text-black sticky top-0 bg-white z-10">
          <span>#</span>
          <span>address</span>
          <span>total won ($SLOT)</span>
          <span>spins/win ratio</span>
        </div>
        <div className="space-y-2 pt-2">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[7%_1fr_1fr_1fr] gap-4 items-center text-sm py-2 rounded text-black hover:bg-gray-50"
            >
              <div className="flex">
                <span className="w-6 h-6 flex items-center justify-center rounded text-white bg-blue-500">
                  {i + 1}
                </span>
              </div>
              <div className="text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                0x1234...5678
              </div>
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                $$
              </div>
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                0/0
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
