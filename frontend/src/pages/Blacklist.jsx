import { MessageSquare } from 'lucide-react'

export default function Blacklist() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Gửi tin nhắn</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-10 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
          <MessageSquare size={28} className="text-blue-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">Tính năng đang phát triển</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            Trang này sẽ cho phép gửi tin nhắn Telegram đến toàn bộ khách hàng hoặc một khách hàng cụ thể.
          </p>
        </div>
        <div className="mt-2 flex gap-3">
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500">📢 Broadcast tất cả</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500">💬 Nhắn riêng khách hàng</span>
        </div>
      </div>
    </div>
  )
}