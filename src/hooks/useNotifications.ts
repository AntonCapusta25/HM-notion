import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Notification {
  id: string
  user_id: string
  task_id: string | null
  type: 'task_assigned' | 'task_due' | 'task_overdue' | 'comment_added' | 'subtask_completed'
  message: string
  read: boolean
  created_at: string
  task?: { title: string } | null
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*, task:task_id(title)')
          .order('created_at', { ascending: false })
          .limit(20)

        if (data && !error) {
          setNotifications(data)
          setUnreadCount(data.filter(n => !n.read).length)
        }
      } catch (err) {
        console.error('Error fetching notifications:', err)
      }
    }

    fetchNotifications()

    // Real-time subscription for new notifications
    const subscription = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotification = payload.new as Notification
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)
        
        // Optional: Show toast notification
        console.log('New notification:', newNotification.message)
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [user])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (!error) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false)

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  }
}
