import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, error, clearError } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');

  // Sign In form state
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  // Sign Up form state
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!signInData.email || !signInData.password) {
      return;
    }

    setIsLoading(true);
    try {
      await signIn(signInData.email, signInData.password);
      navigate('/');
    } catch (err) {
      console.error('Sign in failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!signUpData.email || !signUpData.password || !signUpData.name) {
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      return;
    }

    if (signUpData.password.length < 6) {
      return;
    }

    setIsLoading(true);
    try {
      await signUp(signUpData.email, signUpData.password, signUpData.name);
      navigate('/');
    } catch (err) {
      console.error('Sign up failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-8 border-b border-border">
            <h1 className="text-3xl font-bold text-foreground text-center">{t.auth.appName}</h1>
            <p className="text-muted-foreground text-center mt-2">{t.auth.familyManagement}</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-4">
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive ml-2">{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">{t.auth.signIn}</TabsTrigger>
              <TabsTrigger value="signup">{t.auth.signUp}</TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t.auth.email}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder={t.auth.emailPlaceholder}
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t.auth.password}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t.auth.passwordPlaceholder}
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      disabled={isLoading}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !signInData.email || !signInData.password}
                  className="w-full"
                >
                  {isLoading ? t.auth.signingIn : t.auth.signIn}
                </Button>

                {/* Demo Credentials */}
                <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">{t.auth.demoAccount}</p>
                  <p>{t.auth.demoEmail}</p>
                  <p>{t.auth.demoPassword}</p>
                </div>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t.auth.fullName}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t.auth.fullNamePlaceholder}
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t.auth.email}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder={t.auth.emailPlaceholder}
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t.auth.password}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t.auth.passwordPlaceholder}
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      disabled={isLoading}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {signUpData.password && signUpData.password.length < 6 && (
                    <p className="text-sm text-destructive mt-1">{t.auth.passwordMinLength}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t.auth.confirmPassword}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t.auth.passwordPlaceholder}
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      disabled={isLoading}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {signUpData.confirmPassword && signUpData.password !== signUpData.confirmPassword && (
                  <p className="text-sm text-destructive">{t.auth.passwordMismatch}</p>
                )}

                <Button
                  type="submit"
                  disabled={
                    isLoading ||
                    !signUpData.email ||
                    !signUpData.password ||
                    !signUpData.name ||
                    signUpData.password.length < 6 ||
                    signUpData.password !== signUpData.confirmPassword
                  }
                  className="w-full"
                >
                  {isLoading ? t.auth.creatingAccount : t.auth.signUp}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
