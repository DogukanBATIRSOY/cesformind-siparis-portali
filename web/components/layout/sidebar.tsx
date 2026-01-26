'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSidebarStore, useAuthStore } from '@/lib/store'
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Truck,
  CreditCard,
  Warehouse,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Boxes,
} from 'lucide-react'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'SALES_REP', 'WAREHOUSE'],
  },
  {
    title: 'Müşteriler',
    href: '/customers',
    icon: Users,
    roles: ['ADMIN', 'SALES_REP'],
  },
  {
    title: 'Ürünler',
    href: '/products',
    icon: Package,
    roles: ['ADMIN', 'SALES_REP', 'WAREHOUSE'],
  },
  {
    title: 'Kategoriler',
    href: '/categories',
    icon: Boxes,
    roles: ['ADMIN'],
  },
  {
    title: 'Siparişler',
    href: '/orders',
    icon: ShoppingCart,
    roles: ['ADMIN', 'SALES_REP', 'WAREHOUSE', 'CUSTOMER'],
  },
  {
    title: 'Teslimatlar',
    href: '/deliveries',
    icon: Truck,
    roles: ['ADMIN', 'WAREHOUSE', 'DELIVERY'],
  },
  {
    title: 'Ödemeler',
    href: '/payments',
    icon: CreditCard,
    roles: ['ADMIN', 'SALES_REP'],
  },
  {
    title: 'Depolar',
    href: '/warehouses',
    icon: Warehouse,
    roles: ['ADMIN', 'WAREHOUSE'],
  },
  {
    title: 'Raporlar',
    href: '/reports',
    icon: BarChart3,
    roles: ['ADMIN', 'SALES_REP'],
  },
  {
    title: 'Ayarlar',
    href: '/settings',
    icon: Settings,
    roles: ['ADMIN'],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebarStore()
  const user = useAuthStore((state) => state.user)

  const filteredItems = menuItems.filter(
    (item) => item.roles.includes(user?.role || '')
  )

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200 transition-all duration-300 flex flex-col',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b">
        {isOpen ? (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-[#852EC5] via-[#4F79DD] to-[#11D1F8] p-2 rounded-lg">
              <Image
                src="/cesformind-logo.svg"
                alt="Cesformind"
                width={120}
                height={32}
                className="object-contain"
              />
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center justify-center w-full">
            <div className="bg-gradient-to-r from-[#852EC5] to-[#4F79DD] p-2 rounded-lg">
              <Image
                src="/cesformind-logo.svg"
                alt="Cesformind"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
          </Link>
        )}
        <button
          onClick={toggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
        >
          {isOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {isOpen && <span className="font-medium">{item.title}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      {isOpen && user && (
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user.firstName[0]}
                {user.lastName[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.role === 'ADMIN' && 'Yönetici'}
                {user.role === 'SALES_REP' && 'Satış Temsilcisi'}
                {user.role === 'WAREHOUSE' && 'Depo Görevlisi'}
                {user.role === 'DELIVERY' && 'Teslimatçı'}
                {user.role === 'CUSTOMER' && 'Müşteri'}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
