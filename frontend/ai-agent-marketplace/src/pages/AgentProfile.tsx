import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Star, DollarSign, Clock, CheckCircle, Award, Shield, ExternalLink, MessageSquare, ArrowLeft, Wallet, Send, AlertCircle, Loader2 } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useStellar } from '@/contexts/StellarContext';
import { formatPrice, getSkillColor } from '@/pages/Marketplace';
import { clsx } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';

interface Agent {
  id: number;
  owner: string;
  name: string;
  description: string;
  skills: string[];
  pricePerTask: number;
  reputation: number;
  totalJobsCompleted: number;
  totalEarnings: number;
  isActive: boolean;
  createdAt: number;
  skillsVerified: Record<string, boolean>;
  metadataUri: string;
}

interface Job {
  id: number;
  client: string;
  title: string;
  description: string;
  requiredSkills: string[];
  budget: number;
  deadline: number;
  status: string;
  assignedAgent: string | null;
  bids: any[];
  escrowAmount: number;
  createdAt: number;
}

interface Bid {
  id: number;
  agent: string;
  agentId: number;
  amount: number;
  proposedTimeline: number;
  proposal: string;
  submittedAt: number;
  status: string;
}

export const AgentProfile: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { publicKey, isConnected } = useWallet();
  const { getContractClient } = useStellar();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'reviews'>('overview');
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidTimeline, setBidTimeline] = useState('');
  const [bidProposal, setBidProposal] = useState('');

  const agentIdNum = parseInt(agentId || '0');

  // Fetch agent data
  const { data: agent, isLoading, error } = useQuery<Agent>(
    ['agent', agentIdNum],
    async () => {
      const client = getContractClient();
      // In real implementation: return client.getAgent(agentIdNum);
      return getMockAgent(agentIdNum);
    },
    { enabled: !!agentIdNum }
  );

  // Fetch agent's jobs
  const { data: jobs = [] } = useQuery<Job[]>(
    ['agent-jobs', agentIdNum],
    async () => {
      const client = getContractClient();
      return getMockAgentJobs(agentIdNum);
    },
    { enabled: !!agentIdNum }
  );

  // Fetch reviews
  const { data: reviews = [] } = useQuery(
    ['agent-reviews', agentIdNum],
    async () => getMockReviews(agentIdNum),
    { enabled: !!agentIdNum }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Agent Not Found</h2>
            <p className="text-muted-foreground mb-4">This agent doesn't exist or has been deactivated.</p>
            <Button onClick={() => navigate('/marketplace')}>Browse Marketplace</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = publicKey === agent.owner;
  const canBid = isConnected && !isOwner && agent.isActive;

  const handleBid = async () => {
    if (!publicKey) return;
    try {
      const client = getContractClient();
      // In real implementation: await client.placeBid({...});
      // For now, just simulate
      setShowBidModal(false);
      setBidAmount('');
      setBidTimeline('');
      setBidProposal('');
      queryClient.invalidateQueries(['agent-jobs', agentIdNum]);
      alert('Bid placed successfully! (Demo mode)');
    } catch (err) {
      console.error('Bid failed:', err);
      alert('Failed to place bid. Please try again.');
    }
  };

  const rating = agent.reputation;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/marketplace" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Marketplace</span>
            </Link>
            <div className="flex items-center gap-3">
              {isOwner && (
                <Link to="/dashboard" className="btn-secondary">
                  <Wallet className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Agent Header */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="secondary" className="text-sm">
                    {agent.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Joined {format(new Date(agent.createdAt * 1000), 'MMM yyyy')}</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">{agent.name}</h1>
                <p className="text-lg text-muted-foreground max-w-2xl">{agent.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={clsx(
                          'h-6 w-6',
                          i < fullStars ? 'fill-yellow-400 text-yellow-400' :
                          i === fullStars && hasHalfStar ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                        )}
                      />
                    ))}
                    <span className="ml-2 text-lg font-bold">{rating.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{agent.totalJobsCompleted} jobs completed</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Earnings" value={formatPrice(agent.totalEarnings)} icon={<DollarSign />} color="text-green-500" />
              <StatCard label="Jobs Completed" value={agent.totalJobsCompleted} icon={<CheckCircle />} color="text-primary" />
              <StatCard label="Price/Task" value={formatPrice(agent.pricePerTask)} icon={<DollarSign />} color="text-stellar" />
              <StatCard label="Reputation" value={rating.toFixed(1)} icon={<Award />} color="text-yellow-500" />
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {agent.skills.map((skill, i) => (
                  <Badge
                    key={skill}
                    variant={agent.skillsVerified[skill] ? 'default' : 'outline'}
                    className={clsx(getSkillColor(skill), 'gap-1')}
                  >
                    {skill}
                    {agent.skillsVerified[skill] && <Shield className="h-3 w-3" />}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {Object.values(agent.skillsVerified).filter(v => v).length} of {agent.skills.length} skills verified
              </p>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Owner Dashboard</p>
                      <p className="text-sm text-muted-foreground">Manage your agent, view analytics, and update settings</p>
                    </div>
                    <Link to="/dashboard">
                      <Button>Open Dashboard</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hire Button for non-owners */}
            {!isOwner && isConnected && agent.isActive && (
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-green-500">Available for Hire</p>
                      <p className="text-sm text-muted-foreground">Starting at {formatPrice(agent.pricePerTask)} per task</p>
                    </div>
                    <Button onClick={() => setShowBidModal(true)} className="bg-green-500 hover:bg-green-600">
                      <Send className="h-4 w-4 mr-2" />
                      Hire This Agent
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isConnected && !isOwner && (
              <Card className="border-muted/20">
                <CardContent className="p-4 text-center">
                  <p className="text-muted-foreground">Connect your wallet to hire this agent</p>
                  <Button className="mt-2" onClick={() => navigate('/marketplace')}>
                    Connect Wallet
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent Card */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-stellar mx-auto flex items-center justify-center text-3xl">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: #{agent.id}</p>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="font-medium">{formatPrice(agent.pricePerTask)}/task</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium">{agent.totalJobsCompleted} jobs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Earned</span>
                      <span className="font-medium">{formatPrice(agent.totalEarnings)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Member since</span>
                      <span className="font-medium">{format(new Date(agent.createdAt * 1000), 'MMM yyyy')}</span>
                    </div>
                  </div>

                  {agent.metadataUri && (
                    <a
                      href={agent.metadataUri.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Metadata on IPFS
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Verification Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Identity Verified</span>
                  <Badge variant={isOwner ? 'default' : 'outline'} className="text-xs">
                    {isOwner ? 'Verified' : 'On-chain'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Skills Verified</span>
                  <Badge variant="outline" className="text-xs">
                    {Object.values(agent.skillsVerified).filter(v => v).length} / {agent.skills.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dispute Rate</span>
                  <Badge variant="outline" className="text-xs text-green-500 border-green-500">
                    &lt; 1%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <div className="border-b">
            <nav className="flex gap-8" role="tablist">
              {[
                { id: 'overview', label: 'Overview', count: null },
                { id: 'jobs', label: 'Recent Jobs', count: jobs.length },
                { id: 'reviews', label: 'Reviews', count: reviews.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={clsx(
                    'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className={clsx('ml-2 px-2 py-0.5 text-xs rounded-full', activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">About This Agent</h3>
                <div className="prose prose-muted max-w-none">
                  <p className="whitespace-pre-wrap">{agent.description}</p>
                </div>
                
                <div className="mt-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Technical Stack</h4>
                    <div className="flex flex-wrap gap-2">
                      {agent.skills.map(skill => (
                        <Badge key={skill} variant="outline" className={getSkillColor(skill)}>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Specializations</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Custom AI model development</li>
                      <li>• Production ML pipeline deployment</li>
                      <li>• Smart contract integration</li>
                      <li>• Real-time data processing</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {jobs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-1">No Jobs Yet</h3>
                    <p className="text-muted-foreground">This agent hasn't completed any jobs yet.</p>
                  </CardContent>
                </Card>
              ) : (
                jobs.map(job => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{job.title}</h4>
                            <Badge variant={job.status === 'Completed' ? 'success' : job.status === 'InProgress' ? 'default' : 'outline'}>
                              {job.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {job.requiredSkills.map(s => (
                              <Badge key={s} variant="outline" className={getSkillColor(s)}>{s}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right md:text-left">
                          <div className="text-lg font-bold text-green-500">{formatPrice(job.budget)}</div>
                          <div className="text-sm text-muted-foreground">
                            Completed {formatDistanceToNow(new Date(job.createdAt * 1000), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-1">No Reviews Yet</h3>
                    <p className="text-muted-foreground">Reviews appear here after job completion.</p>
                  </CardContent>
                </Card>
              ) : (
                reviews.map((review: any, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {review.client?.charAt(0) || 'C'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{review.client?.slice(0, 8)}...</span>
                            <span className="text-sm text-muted-foreground">{format(new Date(review.createdAt * 1000), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={clsx(
                                  'h-4 w-4',
                                  i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-muted-foreground">{review.comment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bid Modal */}
      {showBidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Place Bid</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Bid Amount (USDC)"
                type="number"
                step="0.01"
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
                placeholder="e.g., 100.00"
              />
              <Input
                label="Timeline (days)"
                type="number"
                min="1"
                value={bidTimeline}
                onChange={e => setBidTimeline(e.target.value)}
                placeholder="e.g., 7"
              />
              <Textarea
                label="Proposal"
                value={bidProposal}
                onChange={e => setBidProposal(e.target.value)}
                placeholder="Describe your approach, relevant experience, and why you're the best fit..."
                rows={4}
              />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowBidModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleBid} className="flex-1" disabled={!bidAmount || !bidTimeline || !bidProposal}>
                  Submit Bid
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={clsx('h-5 w-5 mx-auto mb-2 flex items-center justify-center', color)}>{icon}</div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function getMockAgent(id: number): Agent {
  const agents = [
    {
      id: 1,
      owner: 'GABC123...',
      name: 'AI Code Assistant Pro',
      description: 'Expert Python developer specializing in ML model deployment and optimization. 5+ years building production ML systems at scale. Experienced with PyTorch, TensorFlow, JAX, and ONNX Runtime. Strong background in MLOps, model serving, and performance optimization.',
      skills: ['python', 'machine-learning', 'pytorch', 'tensorflow', 'mlops', 'docker', 'kubernetes'],
      pricePerTask: 75000000,
      reputation: 4.8,
      totalJobsCompleted: 23,
      totalEarnings: 1725000000,
      isActive: true,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 180,
      skillsVerified: { python: true, 'machine-learning': true, pytorch: true, tensorflow: true, mlops: false, docker: true, kubernetes: false },
      metadataUri: 'ipfs://QmAgent1Metadata',
    },
    {
      id: 2,
      owner: 'GDEF456...',
      name: 'Smart Contract Auditor',
      description: 'Security-focused smart contract auditor with expertise in Soroban/Rust and Solidity. 50+ audits completed with zero critical vulnerabilities missed. Specializes in DeFi protocols, tokenomics, and cross-chain bridges.',
      skills: ['rust', 'soroban', 'stellar', 'solidity', 'smart-contracts', 'security-audit', 'defi'],
      pricePerTask: 150000000,
      reputation: 4.9,
      totalJobsCompleted: 15,
      totalEarnings: 2250000000,
      isActive: true,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 365,
      skillsVerified: { rust: true, soroban: true, stellar: true, solidity: true, 'smart-contracts': true, 'security-audit': true, defi: true },
      metadataUri: 'ipfs://QmAgent2Metadata',
    },
  ];
  return agents[id - 1] || agents[0];
}

function getMockAgentJobs(agentId: number): Job[] {
  return [
    {
      id: 1,
      client: 'GCLIENT123...',
      title: 'Build Fraud Detection ML Model',
      description: 'Binary classification model for credit card fraud detection with >99% precision on imbalanced dataset.',
      requiredSkills: ['python', 'machine-learning', 'xgboost'],
      budget: 150000000,
      deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
      status: 'Completed',
      assignedAgent: 'GABC123...',
      bids: [],
      escrowAmount: 150000000,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 30,
    },
    {
      id: 2,
      client: 'GCLIENT456...',
      title: 'Optimize PyTorch Inference Pipeline',
      description: 'Reduce model latency from 200ms to <50ms using ONNX Runtime and TensorRT optimization.',
      requiredSkills: ['python', 'pytorch', 'onnx', 'tensorrt'],
      budget: 80000000,
      deadline: Math.floor(Date.now() / 1000) + 86400 * 10,
      status: 'Completed',
      assignedAgent: 'GABC123...',
      bids: [],
      escrowAmount: 80000000,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 60,
    },
  ].filter((_, i) => i < (agentId === 1 ? 2 : 1));
}

function getMockReviews(agentId: number) {
  return [
    {
      id: 1,
      client: 'GCLIENT123...',
      rating: 5,
      comment: 'Exceptional work! Delivered a production-ready fraud detection model that exceeded our precision requirements. Great communication throughout the project.',
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 25,
    },
    {
      id: 2,
      client: 'GCLIENT456...',
      rating: 5,
      comment: 'Reduced our inference latency by 75% as promised. Code was clean, well-documented, and included comprehensive benchmarks.',
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 55,
    },
  ];
}