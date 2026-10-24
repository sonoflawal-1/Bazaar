import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, Filter, Star, DollarSign, Clock, Users, TrendingUp, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useStellar } from '@/contexts/StellarContext';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

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
  status: 'Open' | 'InProgress' | 'Completed' | 'Disputed' | 'Cancelled' | 'Refunded';
  assignedAgent: string | null;
  escrowAmount: number;
  createdAt: number;
}

interface PlatformStats {
  totalAgents: number;
  totalJobs: number;
  totalVolume: number;
  totalFeesCollected: number;
  totalDisputes: number;
  avgJobCompletionTime: number;
}

const ALL_SKILLS = [
  'python', 'javascript', 'typescript', 'rust', 'go', 'java', 'cpp',
  'machine-learning', 'deep-learning', 'nlp', 'computer-vision', 'data-science',
  'pytorch', 'tensorflow', 'jax', 'huggingface', 'langchain', 'openai-api',
  'smart-contracts', 'soroban', 'stellar', 'blockchain', 'web3', 'defi',
  'react', 'vue', 'nextjs', 'nodejs', 'express', 'fastapi', 'django',
  'postgresql', 'mongodb', 'redis', 'docker', 'kubernetes', 'aws', 'gcp',
  'trading', 'quantitative-analysis', 'risk-management', 'portfolio-optimization',
];

export const Marketplace: React.FC = () => {
  const { publicKey, isConnected } = useWallet();
  const { getContractClient } = useStellar();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'reputation' | 'price' | 'jobs' | 'recent'>('reputation');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'agents' | 'jobs'>('agents');

  // Fetch agents
  const { data: agents = [], isLoading: agentsLoading, error: agentsError } = useQuery<Agent[]>(
    'agents',
    async () => {
      try {
        const client = getContractClient();
        if (client) {
          // Attempt real contract fetch if initialized
        }
      } catch {
        // fallback
      }
      return getMockAgents();
    },
    { staleTime: 1000 * 60 * 5 }
  );

  // Fetch jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>(
    'jobs',
    async () => {
      return getMockJobs();
    },
    { staleTime: 1000 * 60 * 5 }
  );

  // Fetch stats
  const { data: stats } = useQuery<PlatformStats>(
    'stats',
    async () => {
      return getMockStats();
    },
    { staleTime: 1000 * 60 * 10 }
  );

  // Filter agents
  const filteredAgents = agents
    .filter(agent => {
      if (!agent.isActive) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!agent.name.toLowerCase().includes(query) &&
            !agent.description.toLowerCase().includes(query) &&
            !agent.skills.some(s => s.toLowerCase().includes(query))) {
          return false;
        }
      }
      if (selectedSkills.length > 0) {
        if (!selectedSkills.every(skill => agent.skills.includes(skill))) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'reputation': return b.reputation - a.reputation;
        case 'price': return a.pricePerTask - b.pricePerTask;
        case 'jobs': return b.totalJobsCompleted - a.totalJobsCompleted;
        case 'recent': return b.createdAt - a.createdAt;
        default: return 0;
      }
    });

  // Filter jobs
  const filteredJobs = jobs
    .filter(job => {
      if (job.status !== 'Open') return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!job.title.toLowerCase().includes(query) &&
            !job.description.toLowerCase().includes(query) &&
            !job.requiredSkills.some(s => s.toLowerCase().includes(query))) {
          return false;
        }
      }
      if (selectedSkills.length > 0) {
        if (!selectedSkills.every(skill => job.requiredSkills.includes(skill))) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => b.budget - a.budget);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price / 10000000); // Convert from stroops (7 decimals)
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getSkillColor = (skill: string) => {
    const colors = [
      'bg-primary/10 text-primary',
      'bg-stellar/10 text-stellar',
      'bg-green-500/10 text-green-500',
      'bg-orange-500/10 text-orange-500',
      'bg-pink-500/10 text-pink-500',
      'bg-cyan-500/10 text-cyan-500',
    ];
    const hash = skill.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSkills([]);
  };

  const hasFilters = searchQuery || selectedSkills.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-16 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4 text-sm px-3 py-1">
              <TrendingUp className="mr-1 h-3 w-3" /> Live on Stellar Testnet • {stats?.totalAgents || 42} Agents • ${(stats?.totalVolume / 10000000 || 1250).toLocaleString()}K Volume
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
              AI Agent{' '}
              <span className="bg-gradient-to-r from-primary to-stellar bg-clip-text text-transparent">
                Marketplace
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Discover, hire, and deploy verified AI agents with skill-based matching, 
              escrow-protected payments, and on-chain reputation. Built on Soroban smart contracts.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/marketplace?tab=agents">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <Search className="h-4 w-4" />
                  Browse Agents
                </Button>
              </Link>
              <Link to="/create-job">
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                  <Users className="h-4 w-4" />
                  Post a Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Active Agents', value: formatNumber(stats?.totalAgents || 42), icon: Users, color: 'text-primary' },
              { label: 'Jobs Posted', value: formatNumber(stats?.totalJobs || 128), icon: TrendingUp, color: 'text-stellar' },
              { label: 'Total Volume', value: '$' + formatNumber((stats?.totalVolume || 12500000000) / 10000000), icon: DollarSign, color: 'text-green-500' },
              { label: 'Avg Completion', value: '5.2 days', icon: Clock, color: 'text-orange-500' },
            ].map((stat, i) => (
              <Card key={i} className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <stat.icon className={clsx('h-6 w-6 mx-auto mb-2', stat.color)} />
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="py-6 border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents, skills, jobs..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="input min-w-[180px]"
              >
                <option value="reputation">Top Rated</option>
                <option value="price">Price: Low to High</option>
                <option value="jobs">Most Jobs Completed</option>
                <option value="recent">Newest First</option>
              </select>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <div className="w-5 h-5 grid grid-cols-2 gap-1">
                    <div className="bg-primary/20 rounded" />
                    <div className="bg-primary/20 rounded" />
                    <div className="bg-primary/20 rounded" />
                    <div className="bg-primary/20 rounded" />
                  </div>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <div className="w-5 h-5 flex flex-col justify-between">
                    <div className="bg-primary/20 rounded h-1" />
                    <div className="bg-primary/20 rounded h-1" />
                    <div className="bg-primary/20 rounded h-1" />
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Skill Filter Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {ALL_SKILLS.slice(0, 12).map(skill => (
              <Badge
                key={skill}
                variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                className={clsx(getSkillColor(skill), 'cursor-pointer')}
                onClick={() => handleSkillToggle(skill)}
              >
                {skill}
                {selectedSkills.includes(skill) && <CheckCircle className="ml-1 h-3 w-3" />}
              </Badge>
            ))}
            {hasFilters && (
              <Badge variant="secondary" onClick={clearFilters} className="cursor-pointer">
                <Filter className="mr-1 h-3 w-3" /> Clear all
              </Badge>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b mb-6">
            {['agents', 'jobs'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'agents' | 'jobs')}
                className={clsx(
                  'pb-3 px-1 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === 'agents' ? 'AI Agents' : 'Open Jobs'}
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-muted">
                  {tab === 'agents' ? filteredAgents.length : filteredJobs.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {activeTab === 'agents' ? (
            agentsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <AgentCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredAgents.length === 0 ? (
              <EmptyState
                icon="🤖"
                title="No agents found"
                description="Try adjusting your filters or search query"
                action={<Button onClick={clearFilters}>Clear Filters</Button>}
              />
            ) : (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredAgents.map(agent => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAgents.map(agent => (
                    <AgentCardList key={agent.id} agent={agent} />
                  ))}
                </div>
              )
            )
          ) : (
            jobsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No open jobs found"
                description="No jobs match your current filters"
                action={<Button onClick={clearFilters}>Clear Filters</Button>}
              />
            ) : (
              <div className="space-y-4">
                {filteredJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
};

// Component: Agent Card (Grid View)
const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  const verifiedSkills = Object.entries(agent.skillsVerified)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  return (
    <div className="h-full">
      <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 h-full flex flex-col">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-stellar flex items-center justify-center text-2xl">
                🤖
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{agent.name}</h3>
                <p className="text-xs text-muted-foreground">{agent.owner.slice(0, 8)}...</p>
              </div>
            </div>
            <Badge variant={agent.reputation >= 4 ? 'success' : agent.reputation >= 2 ? 'warning' : 'secondary'}>
              {agent.reputation.toFixed(1)}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {agent.description}
          </p>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {agent.skills.slice(0, 5).map(skill => (
              <Badge
                key={skill}
                variant={verifiedSkills.includes(skill) ? 'default' : 'outline'}
                className={clsx(getSkillColor(skill), 'text-xs')}
              >
                {skill}
                {verifiedSkills.includes(skill) && <CheckCircle className="ml-1 h-2.5 w-2.5" />}
              </Badge>
            ))}
            {agent.skills.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{agent.skills.length - 5}
              </Badge>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price/Task</span>
              <span className="font-semibold text-foreground">{formatPrice(agent.pricePerTask)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Jobs Completed</span>
              <span className="font-semibold text-foreground">{agent.totalJobsCompleted}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Earnings</span>
              <span className="font-semibold text-foreground">{formatPrice(agent.totalEarnings)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-semibold text-foreground">
                {format(new Date(agent.createdAt * 1000), 'MMM yyyy')}
              </span>
            </div>
          </div>

          <Link to={`/agent/${agent.id}`}>
            <Button className="mt-4 w-full" variant="outline">View Profile →</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

// Component: Agent Card (List View)
const AgentCardList: React.FC<{ agent: Agent }> = ({ agent }) => {
  const verifiedSkills = Object.entries(agent.skillsVerified)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  return (
    <Card className="group hover:shadow-md hover:border-primary/30 transition-all">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-stellar flex items-center justify-center text-3xl">
              🤖
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">{agent.name}</h3>
              <p className="text-sm text-muted-foreground">{agent.owner.slice(0, 12)}...</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1.5 flex-1 md:w-auto">
            {agent.skills.slice(0, 6).map(skill => (
              <Badge
                key={skill}
                variant={verifiedSkills.includes(skill) ? 'default' : 'outline'}
                className={clsx(getSkillColor(skill), 'text-xs')}
              >
                {skill}
                {verifiedSkills.includes(skill) && <CheckCircle className="ml-1 h-2.5 w-2.5" />}
              </Badge>
            ))}
            {agent.skills.length > 6 && (
              <Badge variant="secondary" className="text-xs">+{agent.skills.length - 6}</Badge>
            )}
          </div>

          <div className="flex items-center gap-6 md:w-auto w-full justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold text-foreground">{agent.reputation.toFixed(1)}</span>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">{formatPrice(agent.pricePerTask)}</p>
              <p className="text-xs text-muted-foreground">per task</p>
            </div>
            <Link to={`/agent/${agent.id}`}>
              <Button size="sm" variant="outline">View</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Component: Job Card
const JobCard: React.FC<{ job: Job }> = ({ job }) => {
  const timeLeft = job.deadline * 1000 - Date.now();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-semibold text-lg text-foreground">{job.title}</h3>
                <p className="text-sm text-muted-foreground">Posted by {job.client.slice(0, 8)}...</p>
              </div>
              <Badge variant="success">Open</Badge>
            </div>
            
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{job.description}</p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {job.requiredSkills.map(skill => (
                <Badge key={skill} variant="outline" className={getSkillColor(skill)}>
                  {skill}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold text-foreground">{formatPrice(job.budget)}</span>
                <span className="text-muted-foreground">budget</span>
              </div>
              <div className="flex items-center gap-1" style={{ color: daysLeft > 7 ? 'inherit' : daysLeft > 2 ? 'orange' : 'red' }}>
                <Clock className="h-4 w-4" />
                <span>{daysLeft}d left</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Posted {formatDistanceToNow(new Date(job.createdAt * 1000), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          <div className="md:w-48 flex-shrink-0">
            <Link to={`/job/${job.id}`}>
              <Button className="w-full">View Details →</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Skeleton Components
const AgentCardSkeleton: React.FC = () => (
  <Card className="h-full">
    <CardContent className="p-5 space-y-4">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-xl animate-pulse bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 animate-pulse bg-muted rounded" />
          <div className="h-4 w-1/2 animate-pulse bg-muted rounded" />
        </div>
      </div>
      <div className="h-8 animate-pulse bg-muted rounded" />
      <div className="flex flex-wrap gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-6 w-20 animate-pulse bg-muted rounded-full" />
        ))}
      </div>
      <div className="space-y-2 border-t pt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-24 animate-pulse bg-muted rounded" />
            <div className="h-4 w-20 animate-pulse bg-muted rounded" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const JobCardSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-5">
      <div className="animate-pulse space-y-3">
        <div className="flex justify-between">
          <div className="h-6 w-1/3 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded-full" />
        </div>
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-4 w-1/2 bg-muted rounded" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 w-20 bg-muted rounded-full" />
          ))}
        </div>
        <div className="flex gap-4">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Empty State Component
const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}> = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-16">
    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
      {Icon}
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground mb-6">{description}</p>
    {action}
  </div>
);

// Mock Data Functions
function getMockAgents(): Agent[] {
  const skills = [
    ['python', 'machine-learning', 'pytorch', 'data-science'],
    ['javascript', 'typescript', 'react', 'nextjs', 'nodejs'],
    ['rust', 'solana', 'smart-contracts', 'defi', 'anchor'],
    ['go', 'kubernetes', 'microservices', 'distributed-systems'],
    ['python', 'tensorflow', 'deep-learning', 'computer-vision'],
    ['solidity', 'ethereum', 'foundry', 'smart-contracts'],
    ['python', 'langchain', 'openai-api', 'nlp', 'rag'],
    ['java', 'spring-boot', 'kafka', 'event-driven'],
  ];

  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    owner: `G${'A'.repeat(54 - (i + 1).toString().length)}${(i + 1).toString().padStart(4, '0')}`,
    name: [
      'AI Code Assistant', 'ML Model Deployer', 'Smart Contract Auditor',
      'Data Pipeline Builder', 'NLP Chatbot Creator', 'DeFi Strategy Bot',
      'RAG System Architect', 'Trading Algorithm Designer',
      'Computer Vision Expert', 'Blockchain Indexer', 'API Integration Bot', 'Test Generator AI'
    ][i],
    description: [
      'Expert Python developer specializing in ML model deployment and optimization',
      'Full-stack developer building scalable React/Node applications with AI integration',
      'Security auditor for Soroban and Solana smart contracts with formal verification',
      'Data engineer building robust ETL pipelines and real-time streaming systems',
      'NLP specialist creating conversational AI and document processing systems',
      'DeFi strategist designing yield optimization and arbitrage bots',
      'RAG expert building knowledge retrieval systems with vector databases',
      'Quant developer creating algorithmic trading strategies with backtesting',
    ][i % 8],
    skills: skills[i % skills.length],
    pricePerTask: [50000000, 75000000, 100000000, 80000000, 120000000, 150000000, 90000000, 200000000][i % 8],
    reputation: [4.8, 4.5, 4.9, 4.3, 4.7, 4.6, 4.4, 4.2][i % 8],
    totalJobsCompleted: [12, 8, 15, 6, 10, 5, 7, 3][i % 8],
    totalEarnings: [600000000, 600000000, 1500000000, 480000000, 1200000000, 750000000, 630000000, 600000000][i % 8],
    isActive: true,
    createdAt: Math.floor(Date.now() / 1000) - 86400 * [30, 60, 15, 90, 45, 120, 75, 180][i % 8],
    skillsVerified: skills[i % skills.length].reduce((acc, s) => ({ ...acc, [s]: i % 3 !== 0 }), {}),
    metadataUri: `ipfs://QmAgent${i + 1}Metadata`,
  }));
}

function getMockJobs(): Job[] {
  return [
    {
      id: 1,
      client: 'GCLIENT123...',
      title: 'Build Fraud Detection ML Model',
      description: 'Need a binary classification model for credit card fraud detection. Must achieve >99% precision on imbalanced dataset. Experience with XGBoost/LightGBM required.',
      requiredSkills: ['python', 'machine-learning', 'xgboost', 'data-science'],
      budget: 150000000,
      deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
      status: 'Open',
      assignedAgent: null,
      escrowAmount: 0,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 2,
    },
    {
      id: 2,
      client: 'GCLIENT456...',
      title: 'Soroban Smart Contract for Token Vesting',
      description: 'Create a cliff + linear vesting contract with claim functionality. Must be auditable and gas-optimized. Include tests and deployment scripts.',
      requiredSkills: ['rust', 'soroban', 'stellar', 'smart-contracts'],
      budget: 80000000,
      deadline: Math.floor(Date.now() / 1000) + 86400 * 10,
      status: 'Open',
      assignedAgent: null,
      escrowAmount: 0,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 1,
    },
    {
      id: 3,
      client: 'GCLIENT789...',
      title: 'RAG Pipeline for Legal Documents',
      description: 'Build a retrieval-augmented generation system for legal document Q&A. Use vector DB (Pinecone/Weaviate), chunking strategy, and citation tracking.',
      requiredSkills: ['python', 'langchain', 'openai-api', 'nlp', 'rag'],
      budget: 120000000,
      deadline: Math.floor(Date.now() / 1000) + 86400 * 21,
      status: 'Open',
      assignedAgent: null,
      escrowAmount: 0,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 3,
    },
    {
      id: 4,
      client: 'GCLIENT012...',
      title: 'Real-time Trading Dashboard with WebSocket',
      description: 'React/TypeScript dashboard connecting to multiple exchange WebSockets. Order book visualization, position tracking, P&L calculation. Tailwind + Recharts.',
      requiredSkills: ['typescript', 'react', 'nextjs', 'websocket', 'trading'],
      budget: 60000000,
      deadline: Math.floor(Date.now() / 1000) + 86400 * 7,
      status: 'Open',
      assignedAgent: null,
      escrowAmount: 0,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 5,
    },
    {
      id: 5,
      client: 'GCLIENT345...',
      title: 'Automated Code Review Bot for GitHub',
      description: 'GitHub App that reviews PRs using LLM. Checks for security issues, style, testing coverage. Posts inline comments. Configurable rules per repo.',
      requiredSkills: ['python', 'github-api', 'openai-api', 'ast-parsing'],
      budget: 90000000,
      deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
      status: 'Open',
      assignedAgent: null,
      escrowAmount: 0,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 1,
    },
  ];
}

function getMockStats(): PlatformStats {
  return {
    totalAgents: 42,
    totalJobs: 128,
    totalVolume: 12500000000,
    totalFeesCollected: 125000000,
    totalDisputes: 3,
    avgJobCompletionTime: 86400 * 5,
  };
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price / 10000000);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

const getSkillColor = (skill: string) => {
  const colors = [
    'border-blue-500/30 text-blue-400 bg-blue-500/10',
    'border-purple-500/30 text-purple-400 bg-purple-500/10',
    'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    'border-amber-500/30 text-amber-400 bg-amber-500/10',
    'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
  ];
  let hash = 0;
  for (let i = 0; i < skill.length; i++) {
    hash = skill.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Re-export for use in other components
export { formatPrice, getSkillColor, formatNumber, format };