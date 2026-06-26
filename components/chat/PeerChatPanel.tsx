"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Search,
  ShieldAlert,
  Send,
  Users,
  Building,
  BookOpen,
  X,
  Loader2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatRoom {
  id: string;
  name: string;
  type: "department" | "team" | "section";
  createdBy: string | null;
  memberIds: string; // JSON string of student IDs
  createdAt: string;
}

interface PeerMessage {
  id: string;
  senderId: string;
  senderName: string;
  roomId: string;
  content: string;
  flagged: number;
  flagReason: string | null;
  moderationStatus: "pending" | "clean" | "flagged" | "blocked";
  sentAt: string;
}

interface ModerationAlert {
  alertId: string;
  messageId: string;
  roomId: string;
  reason: string;
  createdAt: string;
  content: string;
  senderName: string;
}

interface Student {
  id: string;
  name: string;
  class: string;
  section: string;
}

export default function PeerChatPanel() {
  const { data: session } = useSession();
  const currentUser = session?.user;
  const isFaculty = currentUser?.role && ["teacher", "admin", "principal"].includes(currentUser.role);
  const studentId = currentUser?.studentId;

  // Rooms and Messages State
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PeerMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [restriction, setRestriction] = useState<"none" | "flag_only" | "read_only" | "locked">("none");
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Input State
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modals / Slide-outs State
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isModPanelOpen, setIsModPanelOpen] = useState(false);
  const [flaggedAlerts, setFlaggedAlerts] = useState<ModerationAlert[]>([]);

  // Room Creation Form State
  const [newRoomName, setNewRoomName] = useState("");
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [searchedStudents, setSearchedStudents] = useState<Student[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Student[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomModalError, setRoomModalError] = useState("");

  // Refs for Chat Auto-Scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastScrollRoomId = useRef<string | null>(null);

  // 1. Fetch restriction status for student
  useEffect(() => {
    if (currentUser?.role === "student" && studentId) {
      fetch(`/api/discipline?studentId=${studentId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.restriction) {
            setRestriction(data.restriction);
          }
        })
        .catch((err) => console.error("Error checking restriction status:", err));
    }
  }, [currentUser, studentId]);

  // 2. Fetch Chat Rooms
  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/chat/rooms");
      const data = await res.json();
      if (data.data) {
        setRooms(data.data);
        if (data.data.length > 0 && !activeRoomId) {
          setActiveRoomId(data.data[0].id);
        }
      }
      if (data.restriction) {
        setRestriction(data.restriction);
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // 3. Fetch Messages for Active Room
  const fetchMessages = async (roomId: string, silent = false) => {
    if (!silent) setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
      const data = await res.json();
      if (data.data) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
      // Clear unread count for this room
      setUnreadCounts((prev) => ({ ...prev, [activeRoomId]: 0 }));
    }
  }, [activeRoomId]);

  // 4. Fetch Flagged Alerts (for Faculty/Admin only)
  const fetchFlaggedAlerts = async () => {
    if (!isFaculty) return;
    try {
      const res = await fetch("/api/chat/moderate");
      const data = await res.json();
      if (data.data) {
        setFlaggedAlerts(data.data);
      }
    } catch (err) {
      console.error("Error fetching flagged messages:", err);
    }
  };

  useEffect(() => {
    if (isFaculty) {
      fetchFlaggedAlerts();
    }
  }, [isFaculty]);

  // 5. Polling for New Messages & Flags (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeRoomId) {
        fetchMessages(activeRoomId, true);
      }
      if (isFaculty) {
        fetchFlaggedAlerts();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeRoomId, isFaculty]);

  // Scroll to bottom on new messages or room changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isRoomChange = activeRoomId !== lastScrollRoomId.current;
    
    // Scroll to bottom if room changes OR if the user is already near the bottom
    const threshold = 150; // px threshold from bottom
    const isCloseToBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;

    if (isRoomChange || isCloseToBottom) {
      container.scrollTop = container.scrollHeight;
    }

    if (activeRoomId) {
      lastScrollRoomId.current = activeRoomId;
    }
  }, [messages, activeRoomId]);

  // Auto-resize message textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    // Typing indicator animation trigger (local only)
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1500);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRoomId || restriction === "read_only" || restriction === "locked") return;

    const textToSend = inputText;
    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Optimistic UI Update
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: PeerMessage = {
      id: tempId,
      senderId: studentId || "faculty",
      senderName: currentUser?.name || "Me",
      roomId: activeRoomId,
      content: textToSend,
      flagged: 0,
      flagReason: null,
      moderationStatus: "pending",
      sentAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    
    // Scroll to bottom immediately on optimistic update
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 10);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: activeRoomId, content: textToSend }),
      });
      const data = await res.json();
      if (data.error) {
        // Rollback optimistic update on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert(data.error);
      } else if (data.data) {
        // Replace temp message with verified DB message
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data.data : m)));
        
        // Scroll to bottom on server receipt
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 50);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("Error sending message:", err);
    }
  };

  // Search Students for Room Creation
  useEffect(() => {
    if (!searchStudentQuery.trim()) {
      setSearchedStudents([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingStudents(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(searchStudentQuery)}&limit=10`);
        const data = await res.json();
        if (data.data && data.data.students) {
          // Filter out already selected members and the current student
          const filtered = data.data.students.filter(
            (s: Student) => s.id !== studentId && !selectedMembers.some((m) => m.id === s.id)
          );
          setSearchedStudents(filtered);
        }
      } catch (err) {
        console.error("Error searching students:", err);
      } finally {
        setIsSearchingStudents(false);
      }
    }, 300); // Debounce search

    return () => clearTimeout(delayDebounce);
  }, [searchStudentQuery, selectedMembers, studentId]);

  // Create Team Room
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      setRoomModalError("Room name is required.");
      return;
    }
    if (selectedMembers.length === 0) {
      setRoomModalError("Select at least one member.");
      return;
    }

    setIsCreatingRoom(true);
    setRoomModalError("");

    try {
      const memberIds = [studentId || "", ...selectedMembers.map((m) => m.id)].filter(Boolean);
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: newRoomName, members: memberIds }),
      });
      const data = await res.json();
      if (data.error) {
        setRoomModalError(data.error);
      } else if (data.data) {
        setRooms((prev) => [...prev, data.data]);
        setActiveRoomId(data.data.id);
        setIsRoomModalOpen(false);
        setNewRoomName("");
        setSelectedMembers([]);
        setSearchStudentQuery("");
      }
    } catch {
      setRoomModalError("Failed to create room. Please try again.");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Resolve moderation flag
  const handleResolveFlag = async (messageId: string, action: "approve" | "remove") => {
    try {
      const res = await fetch("/api/chat/moderate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setFlaggedAlerts((prev) => prev.filter((a) => a.messageId !== messageId));
        // Refresh messages in the current room in case the modified message is inside it
        if (activeRoomId) {
          fetchMessages(activeRoomId, true);
        }
      }
    } catch (err) {
      console.error("Error resolving flag:", err);
    }
  };

  const getRoomIcon = (type: ChatRoom["type"]) => {
    switch (type) {
      case "department":
        return <Building className="h-4 w-4 text-indigo-500" />;
      case "section":
        return <BookOpen className="h-4 w-4 text-emerald-500" />;
      case "team":
        return <Users className="h-4 w-4 text-pink-500" />;
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-black/[0.04] bg-white/80 dark:border-white/[0.04] dark:bg-[#1c1c1e]/80 backdrop-blur-2xl">
      {/* 1. LEFT SIDEBAR */}
      <div className="relative flex w-80 flex-col border-r border-black/[0.04] dark:border-white/[0.04]">
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-black/[0.04] dark:border-white/[0.04]">
          <h2 className="text-md font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
            Collaboration Chat
          </h2>
          {restriction !== "read_only" && restriction !== "locked" && (
            <button
              onClick={() => setIsRoomModalOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-all"
              title="Create Team Room"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Restriction Status Banners */}
        {restriction === "read_only" && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 px-4 py-2 border-b border-amber-100 dark:border-amber-900/30 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Read-Only mode active. Chat functions restricted.</span>
          </div>
        )}

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingRooms ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">No rooms available.</div>
          ) : (
            rooms.map((room) => {
              const isActive = room.id === activeRoomId;
              const unread = unreadCounts[room.id] || 0;

              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-white shadow-sm border border-black/[0.02]"
                      : "text-slate-600 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow-sm dark:bg-black/20">
                      {getRoomIcon(room.type)}
                    </div>
                    <span className="truncate">{room.name}</span>
                  </div>
                  {unread > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* LOCKED PORTAL SUSPENSION OVERLAY */}
        {restriction === "locked" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center backdrop-blur-sm">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 mb-4 shadow-lg shadow-rose-500/10">
              <ShieldAlert className="h-6 w-6 text-rose-500" />
            </div>
            <h3 className="text-md font-bold text-white">Chat Access Suspended</h3>
            <p className="mt-2 text-xs text-zinc-400">
              Collaboration features have been locked due to behavioral red dot flags. Contact administration for details.
            </p>
          </div>
        )}
      </div>

      {/* 2. MAIN CHAT AREA */}
      <div className="flex flex-1 flex-col bg-slate-50/50 dark:bg-[#151517]/30">
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <div className="flex h-16 items-center justify-between border-b border-black/[0.04] px-6 bg-white dark:bg-[#1c1c1e] dark:border-white/[0.04]">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  {activeRoom.name}
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                    activeRoom.type === "department" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400" :
                    activeRoom.type === "section" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" :
                    "bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400"
                  )}>
                    {activeRoom.type}
                  </span>
                </h3>
              </div>

              {/* Faculty Moderation Tools Button */}
              {isFaculty && (
                <button
                  onClick={() => setIsModPanelOpen(true)}
                  className="relative flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/30 transition-all shadow-sm"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Moderation
                  {flaggedAlerts.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
                      {flaggedAlerts.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Message Feed */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-slate-400 dark:text-zinc-500">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-xs">No messages yet. Send a message to start the conversation!</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderId === studentId || (msg.senderId === "faculty" && isFaculty);
                  const isFlagged = msg.flagged === 1;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex items-end gap-2.5",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      {/* Avatar for other senders */}
                      {!isOwn && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white uppercase shadow-sm">
                          {msg.senderName.substring(0, 2)}
                        </div>
                      )}

                      <div className="flex flex-col max-w-[70%]">
                        {/* Sender name & time */}
                        <div className={cn("flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 px-1 mb-0.5", isOwn && "justify-end")}>
                          <span className="font-semibold text-slate-600 dark:text-zinc-400">{msg.senderName}</span>
                          <span>•</span>
                          <span>
                            {new Date(msg.sentAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2 text-sm shadow-sm relative border transition-all",
                            isOwn
                              ? "bg-indigo-600 text-white border-indigo-600 rounded-br-none"
                              : "bg-white text-slate-800 dark:bg-zinc-800 dark:text-white border-black/[0.04] dark:border-white/[0.04] rounded-bl-none",
                            isFlagged && isFaculty && "border-rose-400 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/10"
                          )}
                        >
                          {isFlagged ? (
                            isFaculty ? (
                              <div className="space-y-1.5">
                                <span className="italic line-through opacity-70">{msg.content}</span>
                                <div className="flex items-center gap-1.5 rounded-lg bg-rose-100/50 dark:bg-rose-900/20 px-2 py-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30">
                                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                  <span>Flagged: {msg.flagReason}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="italic text-slate-400 dark:text-zinc-500">
                                [Message removed by moderator]
                              </span>
                            )
                          ) : (
                            <span className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center gap-2 px-1 text-[10px] text-slate-400 dark:text-zinc-500 font-medium"
                  >
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span>Student is typing...</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Local scrolling container end spacer */}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="border-t border-black/[0.04] p-4 bg-white dark:bg-[#1c1c1e] dark:border-white/[0.04] flex items-end gap-3"
            >
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleTextareaChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  rows={1}
                  maxLength={500}
                  disabled={restriction === "read_only" || restriction === "locked"}
                  placeholder={
                    restriction === "read_only"
                      ? "Collaboration restricted (Read-Only)"
                      : "Type a message..."
                  }
                  className={cn(
                    "w-full resize-none rounded-xl border border-black/[0.06] bg-slate-50 py-3 pl-4 pr-16 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white transition-all max-h-[120px] focus:ring-1 focus:ring-indigo-500/50",
                    (restriction === "read_only" || restriction === "locked") && "opacity-60 cursor-not-allowed"
                  )}
                />
                <span className="absolute right-3 bottom-3 text-[10px] font-semibold text-slate-400 dark:text-zinc-500">
                  {inputText.length}/500
                </span>
              </div>
              <button
                type="submit"
                disabled={!inputText.trim() || restriction === "read_only" || restriction === "locked"}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-all shadow-md shadow-indigo-600/10 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/50",
                  (!inputText.trim() || restriction === "read_only" || restriction === "locked") &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-slate-400 dark:text-zinc-500">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30 animate-pulse" />
            <p className="text-sm font-semibold">Select a room to begin collaboration</p>
          </div>
        )}
      </div>

      {/* 3. MODERATION ALERTS SLIDE-OUT PANEL (Faculty Only) */}
      <AnimatePresence>
        {isModPanelOpen && isFaculty && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModPanelOpen(false)}
              className="fixed inset-0 z-40 bg-black backdrop-blur-sm"
            />

            {/* Slide-out Sheet */}
            <motion.div
              initial={{ translateX: "100%" }}
              animate={{ translateX: 0 }}
              exit={{ translateX: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l border-black/[0.04] bg-white p-6 shadow-2xl dark:border-white/[0.04] dark:bg-[#1c1c1e]"
            >
              <div className="flex items-center justify-between border-b border-black/[0.04] pb-4 dark:border-white/[0.04]">
                <h3 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  Flagged Content Queue
                </h3>
                <button
                  onClick={() => setIsModPanelOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Alert items list */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {flaggedAlerts.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center text-slate-400 dark:text-zinc-500 text-center px-4">
                    <Check className="h-10 w-10 text-emerald-500 mb-2 p-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-full" />
                    <span className="text-xs font-semibold">All clean! No unresolved moderation flags.</span>
                  </div>
                ) : (
                  flaggedAlerts.map((alert) => (
                    <div
                      key={alert.alertId}
                      className="rounded-xl border border-rose-100 bg-rose-50/20 p-4 dark:border-rose-900/20 dark:bg-rose-950/5 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                            {alert.senderName}
                          </span>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 uppercase">
                          Flagged
                        </span>
                      </div>

                      <div className="rounded-lg bg-white p-3 text-xs italic text-slate-600 dark:bg-black/20 dark:text-zinc-300 border border-black/[0.02] dark:border-white/[0.02] break-words">
                        &quot;{alert.content}&quot;
                      </div>

                      <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1.5 rounded-lg border border-rose-100/50 dark:border-rose-900/10">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Reason: {alert.reason}</span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleResolveFlag(alert.messageId, "approve")}
                          className="flex-1 rounded-xl bg-slate-900 py-2 text-center text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-all shadow-sm"
                        >
                          Approve Msg
                        </button>
                        <button
                          onClick={() => handleResolveFlag(alert.messageId, "remove")}
                          className="flex-1 rounded-xl bg-rose-600 py-2 text-center text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-sm"
                        >
                          Remove Msg
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. ROOM CREATION DIALOG MODAL */}
      <AnimatePresence>
        {isRoomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoomModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-black/[0.04] bg-white p-6 shadow-2xl dark:border-white/[0.04] dark:bg-[#1c1c1e] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-black/[0.04] pb-3 dark:border-white/[0.04]">
                <h3 className="text-md font-bold text-slate-800 dark:text-white">Create Collaboration Room</h3>
                <button
                  onClick={() => setIsRoomModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {roomModalError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{roomModalError}</span>
                </div>
              )}

              {/* Form Input: Room Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Room Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Code Masters, Group Alpha"
                  className="w-full rounded-xl border border-black/[0.06] bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>

              {/* Form Input: Search Members */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Add Members</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchStudentQuery}
                    onChange={(e) => setSearchStudentQuery(e.target.value)}
                    placeholder="Search students by name..."
                    className="w-full rounded-xl border border-black/[0.06] bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>

                {/* Selected Members Chips */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20"
                      >
                        <span>{member.name}</span>
                        <button
                          onClick={() => setSelectedMembers((prev) => prev.filter((m) => m.id !== member.id))}
                          className="rounded-full text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search Results Dropdown */}
                {searchStudentQuery && (
                  <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg dark:border-white/[0.06] dark:bg-[#1c1c1e]">
                    {isSearchingStudents ? (
                      <div className="flex items-center justify-center py-4 text-xs text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Searching...
                      </div>
                    ) : searchedStudents.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">No students found</div>
                    ) : (
                      searchedStudents.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => {
                            setSelectedMembers((prev) => [...prev, student]);
                            setSearchStudentQuery("");
                          }}
                          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-white/5"
                        >
                          <div>
                            <span className="font-bold">{student.name}</span>
                            <span className="ml-1 text-[10px] opacity-60">
                              ({student.class}-{student.section})
                            </span>
                          </div>
                          <Plus className="h-3 w-3 text-slate-400" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 border-t border-black/[0.04] pt-4 dark:border-white/[0.04]">
                <button
                  onClick={() => setIsRoomModalOpen(false)}
                  className="flex-1 rounded-xl border border-black/[0.06] py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/[0.06] dark:text-zinc-400 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreatingRoom || !newRoomName.trim() || selectedMembers.length === 0}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingRoom ? "Creating..." : "Create Room"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
