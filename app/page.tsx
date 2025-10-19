"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Circle, Plus, Trash2, Pencil, X, LogIn, UserPlus, LogOut, Image as ImageIcon, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

type Todo = {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
};

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [newTodoImage, setNewTodoImage] = useState<File | null>(null);
  const [newTodoImagePreview, setNewTodoImagePreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // 获取用户和加载 todos
  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchTodos();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTodos();
      } else {
        setTodos([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // 🔴 Realtime 订阅：监听 todos 表的实时变化
  useEffect(() => {
    if (!user) return;

    console.log('📡 Setting up Realtime subscription for user:', user.id);

    // 订阅 todos 表的变化
    const channel = supabase
      .channel('todos-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件：INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${user.id}` // 只监听当前用户的数据
        },
        (payload) => {
          console.log('🔔 Realtime event received:', payload);

          if (payload.eventType === 'INSERT') {
            // 新增 todo
            const newTodo = payload.new as Todo;
            console.log('➕ Adding new todo:', newTodo);
            setTodos((currentTodos) => {
              // 检查是否已存在（避免重复）
              const exists = currentTodos.some(t => t.id === newTodo.id);
              if (exists) {
                console.log('⚠️ Todo already exists, skipping:', newTodo.id);
                return currentTodos;
              }
              return [newTodo, ...currentTodos];
            });
          } else if (payload.eventType === 'UPDATE') {
            // 更新 todo
            const updatedTodo = payload.new as Todo;
            console.log('✏️ Updating todo:', updatedTodo);
            setTodos((currentTodos) =>
              currentTodos.map((todo) =>
                todo.id === updatedTodo.id ? updatedTodo : todo
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // 删除 todo
            const deletedTodo = payload.old as { id: string };
            console.log('🗑️ Deleting todo:', deletedTodo);
            console.log('🗑️ Deleting todo ID:', deletedTodo.id);
            setTodos((currentTodos) => {
              const filtered = currentTodos.filter((todo) => todo.id !== deletedTodo.id);
              console.log('🗑️ Before delete count:', currentTodos.length);
              console.log('🗑️ After delete count:', filtered.length);
              return filtered;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    // 清理订阅
    return () => {
      console.log('🔌 Unsubscribing from Realtime');
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  // 从数据库获取 todos
  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching todos:', error);
        return;
      }

      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTodos([]);
    router.refresh();
  };

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // 验证文件大小（最大 5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setNewTodoImage(file);
      // 创建预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTodoImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 移除图片
  const removeNewTodoImage = () => {
    setNewTodoImage(null);
    setNewTodoImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 上传图片到 Supabase Storage
  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      console.log('📤 Uploading image...', {
        bucket: 'todo list',
        filePath,
        fileSize: file.size,
        fileType: file.type,
        userId
      });

      // 上传文件到 todo list bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('todo list')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Error uploading image:', uploadError);
        console.error('Error details:', {
          message: uploadError.message,
          name: uploadError.name,
          cause: uploadError.cause
        });
        alert(`Upload failed: ${uploadError.message}\nPlease check console for details.`);
        return null;
      }

      console.log('✅ Upload successful:', uploadData);

      // 获取公共 URL
      const { data } = supabase.storage
        .from('todo list')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL:', data.publicUrl);

      return data.publicUrl;
    } catch (error) {
      console.error('❌ Exception uploading image:', error);
      alert(`Upload exception: ${error}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // 从 Storage 删除图片
  const deleteImageFromStorage = async (imageUrl: string) => {
    try {
      // 从 URL 中提取文件路径
      const urlParts = imageUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'todo%20list' || part === 'todo list');
      if (bucketIndex === -1) return;
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      
      const { error } = await supabase.storage
        .from('todo list')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting image from storage:', error);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // 添加新的 todo
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) return;

    try {
      setLoading(true);
      
      let imageUrl: string | null = null;
      
      // 如果有图片，先上传图片
      if (newTodoImage) {
        imageUrl = await uploadImage(newTodoImage, user.id);
        if (!imageUrl) {
          alert('Failed to upload image');
          return;
        }
      }

      const { data, error } = await supabase
        .from('todos')
        .insert([
          {
            text: newTodo.trim(),
            user_id: user.id,
            completed: false,
            image_url: imageUrl,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error adding todo:', error);
        // 如果添加失败，删除已上传的图片
        if (imageUrl) {
          await deleteImageFromStorage(imageUrl);
        }
        return;
      }

      if (data) {
        // ✅ 不做本地更新，等待 Realtime 事件推送
        // 这样可以确保所有客户端看到的数据顺序一致
        console.log('✅ Todo created, waiting for Realtime sync:', data.id);
        setNewTodo("");
        removeNewTodoImage();
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    } finally {
      setLoading(false);
    }
  };

  // 切换 todo 完成状态
  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      const newCompletedState = !todo.completed;
      
      // ⚡ 乐观更新：立即更新 UI
      console.log('⚡ Optimistic toggle: updating UI immediately');
      setTodos((currentTodos) =>
        currentTodos.map((t) =>
          t.id === id ? { ...t, completed: newCompletedState } : t
        )
      );

      const { error } = await supabase
        .from('todos')
        .update({ completed: newCompletedState })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) {
        console.error('❌ Error toggling todo:', error);
        // 失败时恢复原状态
        console.log('⚠️ Toggle failed, restoring original state');
        setTodos((currentTodos) =>
          currentTodos.map((t) =>
            t.id === id ? { ...t, completed: todo.completed } : t
          )
        );
        return;
      }

      console.log('✅ Todo toggled in DB, Realtime will confirm');
    } catch (error) {
      console.error('❌ Exception in toggleTodo:', error);
    }
  };

  // 删除 todo
  const deleteTodo = async (id: string) => {
    console.log('🗑️ deleteTodo called with id:', id);
    console.log('🗑️ Current user:', user?.id);
    console.log('🗑️ Current todos count:', todos.length);
    
    try {
      const todo = todos.find(t => t.id === id);
      console.log('🗑️ Found todo:', todo);
      
      // ⚡ 乐观更新：立即从 UI 移除
      console.log('⚡ Optimistic delete: removing from UI immediately');
      setTodos((currentTodos) => currentTodos.filter(t => t.id !== id));
      
      // 执行数据库删除
      const { data, error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)
        .select();

      if (error) {
        console.error('❌ Error deleting todo:', error);
        // 删除失败，恢复 todo
        console.log('⚠️ Delete failed, restoring todo to UI');
        if (todo) {
          setTodos((currentTodos) => [todo, ...currentTodos]);
        }
        return;
      }

      console.log('✅ Delete successful, response:', data);

      // 如果 todo 有图片，同时删除图片
      if (todo?.image_url) {
        console.log('🗑️ Deleting associated image:', todo.image_url);
        await deleteImageFromStorage(todo.image_url);
      }

      console.log('✅ Todo deleted from DB, Realtime will confirm');
    } catch (error) {
      console.error('❌ Exception in deleteTodo:', error);
    }
  };

  // 移除 todo 的图片
  const removeTodoImage = async (todoId: string) => {
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo?.image_url) return;

      const oldImageUrl = todo.image_url;

      // ⚡ 乐观更新：立即从 UI 移除图片
      console.log('⚡ Optimistic update: removing image from UI immediately');
      setTodos((currentTodos) =>
        currentTodos.map((t) =>
          t.id === todoId ? { ...t, image_url: null } : t
        )
      );

      // 从数据库更新，移除图片 URL
      const { error } = await supabase
        .from('todos')
        .update({ image_url: null })
        .eq('id', todoId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('❌ Error removing image:', error);
        // 失败时恢复图片
        console.log('⚠️ Remove image failed, restoring to UI');
        setTodos((currentTodos) =>
          currentTodos.map((t) =>
            t.id === todoId ? { ...t, image_url: oldImageUrl } : t
          )
        );
        return;
      }

      // 从 Storage 删除图片
      await deleteImageFromStorage(oldImageUrl);

      console.log('✅ Image removed from DB, Realtime will confirm');
    } catch (error) {
      console.error('❌ Exception in removeTodoImage:', error);
    }
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  // 保存编辑的 todo
  const saveEdit = async () => {
    if (!editText.trim() || !editingId) return;

    const oldText = todos.find(t => t.id === editingId)?.text || '';
    const newText = editText.trim();

    try {
      // ⚡ 乐观更新：立即更新 UI
      console.log('⚡ Optimistic update: updating UI immediately');
      setTodos((currentTodos) =>
        currentTodos.map((todo) =>
          todo.id === editingId ? { ...todo, text: newText } : todo
        )
      );
      setEditingId(null);
      setEditText("");

      const { error } = await supabase
        .from('todos')
        .update({ text: newText })
        .eq('id', editingId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('❌ Error updating todo:', error);
        // 失败时恢复原文本
        console.log('⚠️ Update failed, restoring original text');
        setTodos((currentTodos) =>
          currentTodos.map((todo) =>
            todo.id === editingId ? { ...todo, text: oldText } : todo
          )
        );
        return;
      }

      console.log('✅ Todo updated in DB, Realtime will confirm');
    } catch (error) {
      console.error('❌ Exception in saveEdit:', error);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header with auth buttons */}
      <header className="bg-stone-50/80 backdrop-blur-sm border-b border-stone-200/50">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-medium text-stone-800">Todo List</h1>
            
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-stone-500">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-600 hover:bg-cyan-700 transition-all duration-200 text-white text-sm font-medium shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-600 hover:bg-cyan-700 transition-all duration-200 text-white text-sm font-medium shadow-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-stone-50 transition-all duration-200 text-cyan-600 text-sm font-medium border border-cyan-200 shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-8 border border-stone-100">

          {!user ? (
            <div className="text-center py-12">
              <div className="mb-6">
                <Circle className="w-16 h-16 mx-auto text-stone-300" />
              </div>
              <h2 className="text-xl font-medium text-stone-700 mb-2">Please login to manage your todos</h2>
              <p className="text-stone-500 mb-6">You need to be logged in to create and view your todo list.</p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/auth/login"
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-cyan-600 hover:bg-cyan-700 transition-all duration-200 text-white text-sm font-medium shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-stone-50 transition-all duration-200 text-cyan-600 text-sm font-medium border border-cyan-200 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={addTodo} className="mb-8">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      placeholder="Add a new task..."
                      disabled={loading || uploadingImage}
                      className="flex-1 px-6 py-4 rounded-3xl bg-stone-50 border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-transparent transition-all text-[15px] disabled:opacity-50"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || uploadingImage || !!newTodoImage}
                      className="w-14 h-14 flex items-center justify-center rounded-full bg-stone-200 hover:bg-stone-300 transition-all duration-200 text-stone-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add image"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={loading || uploadingImage}
                      className="w-14 h-14 flex items-center justify-center rounded-full bg-cyan-600 hover:bg-cyan-700 transition-all duration-200 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* 图片预览 */}
                  {newTodoImagePreview && (
                    <div className="relative inline-block">
                      <img
                        src={newTodoImagePreview}
                        alt="Preview"
                        className="h-24 w-auto rounded-2xl object-cover border-2 border-stone-200"
                      />
                      <button
                        type="button"
                        onClick={removeNewTodoImage}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  {uploadingImage && (
                    <div className="text-sm text-cyan-600">
                      Uploading image...
                    </div>
                  )}
                </div>
              </form>

              <div className="space-y-2">
                {loading && todos.length === 0 ? (
                  <div className="text-center text-stone-400 py-8">
                    Loading your todos...
                  </div>
                ) : (
                  <>
                    {todos.map((todo) => (
                      <div
                        key={todo.id}
                        className={cn(
                          "group px-5 py-4 rounded-2xl transition-all duration-300 border",
                          "bg-stone-50/50 hover:bg-stone-100/50 border-stone-200/50",
                          todo.completed && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleTodo(todo.id)}
                            className="text-stone-600 hover:text-stone-800 hover:scale-110 transition-transform duration-200"
                          >
                            {todo.completed ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>
                          
                          {editingId === todo.id ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="flex-1 px-4 py-2 rounded-2xl bg-white border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-[15px]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                              />
                              <button
                                onClick={saveEdit}
                                className="p-2 text-stone-600 hover:text-stone-800 transition-colors rounded-full hover:bg-stone-100"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 text-stone-600 hover:text-stone-800 transition-colors rounded-full hover:bg-stone-100"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span
                              className={cn(
                                "flex-1 text-stone-700 transition-all duration-300 text-[15px]",
                                todo.completed && "line-through opacity-60"
                              )}
                            >
                              {todo.text}
                            </span>
                          )}
                          
                          {editingId !== todo.id && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => startEditing(todo)}
                                className="p-2 text-stone-500 hover:text-stone-700 transition-colors rounded-full hover:bg-stone-100"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteTodo(todo.id)}
                                className="p-2 text-stone-500 hover:text-stone-700 transition-colors rounded-full hover:bg-stone-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* 图片附件显示 */}
                        {todo.image_url && (
                          <div className="mt-3 ml-9 relative inline-block group/image">
                            <img
                              src={todo.image_url}
                              alt="Todo attachment"
                              className="h-32 w-auto rounded-xl object-cover border border-stone-200 shadow-sm"
                            />
                            <button
                              onClick={() => removeTodoImage(todo.id)}
                              className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all opacity-0 group-hover/image:opacity-100"
                              title="Remove image"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {todos.length === 0 && !loading && (
                      <div className="text-center text-stone-400 mt-12 text-[15px]">
                        No todos yet. Add one to get started!
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}