"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, LogIn, UserPlus, ShieldCheck, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { API_BASE_URL } from "@/services/apiConfig";

interface LoginFormProps {
  onLoginSuccess: (token: string) => void
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const endpoint = isLogin ? "/login" : "/signup"
      const payload = isLogin ? { email, password } : { fullname: fullName, email, password }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || "Authentication failed")

      localStorage.setItem("access_token", data.access_token)
      onLoginSuccess(data.access_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError("")
    setEmail("")
    setPassword("")
    setFullName("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-black relative overflow-hidden">

      {/* Luxury animated background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(120,60,255,0.25),_transparent)]"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ duration: 1.2 }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(0,140,255,0.25),_transparent)]"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="w-full bg-white/10 backdrop-blur-xl border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.08)] rounded-2xl">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              {/* Logo */}
              <div className="relative mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-xl border border-white/20">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
                <Sparkles className="w-6 h-6 text-yellow-300 absolute -top-2 -right-2 animate-pulse" />
              </div>

              <CardTitle className="text-4xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Secure Access
              </CardTitle>

              <p className="text-gray-300 mt-2 text-sm tracking-wide">
                {isLogin
                  ? "Welcome back to the premium dashboard"
                  : "Create your elite access account"}
              </p>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Full Name (Signup only) */}
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <Label className="text-gray-300 text-sm font-medium">Full Name</Label>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Enter your full name"
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400 transition-all duration-300 rounded-xl"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400 rounded-xl transition-all duration-300"
                />
              </div>

              {/* Password */}
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400 rounded-xl pr-12 transition-all duration-300"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-black-300 hover:text-black transition"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Alert variant="destructive" className="bg-red-500/20 border-red-600/40 text-red-200 rounded-xl">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-600 hover:from-white-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl shadow-xl transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Processing...
                    </div>
                  ) : isLogin ? (
                    <>
                      <LogIn className="w-5 h-5 mr-2" /> Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" /> Create Account
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-400"></span>
              </div>
            </div>

            {/* Switch mode */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="text-center">
              <Button variant="link" className="text-purple-300 hover:text-purple-200 font-medium" disabled>
               
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center mt-6">
          <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-300" /> Enterprise-grade security • Premium UI
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
