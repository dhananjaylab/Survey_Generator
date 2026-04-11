import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-[calc(100-rem)] bg-mesh overflow-hidden">
      {/* Hero Section */}
      <div className="relative pt-20 pb-32 sm:pt-32 sm:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 animate-slide-up">
              Revolutionize Your <br />
              <span className="text-gradient">Survey Experience</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Harness the power of Artificial Intelligence to design, generate, and deploy professional surveys in minutes, not days.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/register">
                <Button size="lg" className="px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                  Start Building for Free
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="px-8 py-4 rounded-full text-lg bg-white bg-opacity-50 backdrop-blur-sm border-gray-200 hover:bg-white transition-all">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-100 rounded-full blur-[120px] opacity-30 z-0"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full blur-[100px] opacity-40 z-0 animate-pulse-slow"></div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'AI Question Generation',
              desc: 'Our advanced LLM integration crafts deep, insightful questions tailored to your specific industry and research goals.',
              icon: '✨',
            },
            {
              title: 'Real-time Collaboration',
              desc: 'Watch your survey take shape in real-time with our live builder and instant preview features.',
              icon: '🚀',
            },
            {
              title: 'Professional Export',
              desc: 'Download your surveys in high-quality DOCX format, ready for distribution or stakeholder review.',
              icon: '📄',
            },
          ].map((feature, i) => (
            <div 
              key={i} 
              className="glass p-8 rounded-2xl transition-all hover:scale-105 hover:bg-white hover:bg-opacity-90 group"
            >
              <div className="text-4xl mb-4 group-hover:animate-float">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Social Proof / Trust Section */}
      <div className="bg-white py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-8">Trusted by teams at</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Use text instead of images for now as spacers */}
             <span className="text-2xl font-bold">TECHCORP</span>
             <span className="text-2xl font-bold">DATAFLOW</span>
             <span className="text-2xl font-bold">INSIGHTS</span>
             <span className="text-2xl font-bold">STRATOS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
