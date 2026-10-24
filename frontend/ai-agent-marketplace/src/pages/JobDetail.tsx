import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { 
  DollarSign, Clock, Star, User, CheckCircle, AlertCircle, 
  ArrowLeft, Send, Wallet, Loader2, ExternalLink, MessageSquare,
  Shield, FileText, XCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useStellar } from '@/contexts/StellarContext';
import { formatPrice, getSkillColor } from '@/pages/Marketplace';
import { clsx } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';

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
  bids: Bid[];
  escrowAmount: number;
  createdAt: number;
  completedAt: number | null;
  deliverableHash: string | null;
  disputeRaised: boolean;
}

interface Bid {
  id: number;
  agent: string;
  agentId: number;
  amount: number;
  proposedTimeline: number;
  proposal: string;
  submittedAt: number;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';
}

interface Agent {
  id: number;
  owner: string;
  name: string;
  reputation: number;
  totalJobsCompleted: number;
  skills: string[];
}

export const JobDetail: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { publicKey, isConnected } = useWallet();
  const { getContractClient } = useStellar();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'bids' | 'activity'>('details');
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidTimeline, setBidTimeline] = useState('');
  const [bidProposal, setBidProposal] = useState('');

  const jobIdNum = parseInt(jobId || '0');

  const { data: job, isLoading, error } = useQuery<Job>(
    ['job', jobIdNum],
    async () => {
      const client = getContractClient();
      return getMockJob(jobIdNum);
    },
    { enabled: !!jobIdNum }
  );

  const isClient = publicKey === job?.client;
  const isAssignedAgent = publicKey === job?.assignedAgent;
  const canBid = isConnected && !isClient && job?.status === 'Open' && !isAssignedAgent;

  const handleBid = async () => {
    if (!publicKey) return;
    try {
      const client = getContractClient();
      // await client.placeBid({...});
      setShowBidModal(false);
      setBidAmount('');
      setBidTimeline('');
      setBidProposal('');
      queryClient.invalidateQueries(['job', jobIdNum]);
      alert('Bid placed successfully! (Demo mode)');
    } catch (err) {
      console.error('Bid failed:', err);
      alert('Failed to place bid. Please try again.');
    }
  };

  const handleAcceptBid = async (bidId: number) => {
    if (!publicKey || !isClient) return;
    try {
      const client = getContractClient();
      // await client.acceptBid({ client: publicKey, jobId: jobIdNum, bidId });
      queryClient.invalidateQueries(['job', jobIdNum]);
      alert('Bid accepted! Escrow funded. (Demo mode)');
    } catch (err) {
      console.error('Accept bid failed:', err);
      alert('Failed to accept bid. Please try again.');
    }
  };

  const handleSubmitDeliverable = async () => {
    if (!publicKey || !isAssignedAgent) return;
    try {
      const client = getContractClient();
      // await client.submitDeliverable({ agent: publicKey, jobId: jobIdNum, deliverableHash: Buffer.from('demo') });
      queryClient.invalidateQueries(['job', jobIdNum]);
      alert('Deliverable submitted! (Demo mode)');
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Failed to submit deliverable.');
    }
  };

  const handleApprove = async () => {
    if (!publicKey || !isClient) return;
    try {
      const client = getContractClient();
      // await client.approveDeliverable({ client: publicKey, jobId: jobIdNum });
      queryClient.invalidateQueries(['job', jobIdNum]);
      alert('Deliverable approved! Payment released. (Demo mode)');
    } catch (err) {
      console.error('Approve failed:', err);
      alert('Failed to approve deliverable.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Job Not Found</h2>
            <p className="text-muted-foreground mb-4">This job doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/marketplace')}>Browse Jobs</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeLeft = job.deadline * 1000 - Date.now();
  const daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
  const isExpired = timeLeft <= 0;

  const statusConfig = {
    Open: { label: 'Open for Bids', color: 'success', icon: DollarSign },
    InProgress: { label: 'In Progress', color: 'default' as const, icon: Clock },
    Completed: { label: 'Completed', color: 'success' as const, icon: CheckCircle },
    Disputed: { label: 'Disputed', color: 'destructive' as const, icon: AlertCircle },
    Cancelled: { label: 'Cancelled', color: 'secondary' as const, icon: XCircle },
    Refunded: { label: 'Refunded', color: 'secondary' as const, icon: XCircle },
  };

  const currentStatus = statusConfig[job.status];

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
              {isClient && (
                <Link to="/dashboard" className="btn-secondary">
                  <Wallet className="h-4 w-4 mr-2" />
                  My Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Job Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant={currentStatus.color}>{currentStatus.label}</Badge>
                {job.disputeRaised && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Dispute Raised
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">Posted {formatDistanceToNow(new Date(job.createdAt * 1000), { addSuffix: true })}</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">{job.title}</h1>
              <p className="text-lg text-muted-foreground max-w-3xl">{job.description}</p>
            </div>
            
            {/* Budget & Deadline Card */}
            <Card className="w-full sm:w-72 flex-shrink-0" style={{ borderColor: isExpired ? 'hsl(var(--destructive))' : 'inherit' }}>
              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="text-3xl font-bold text-foreground">{formatPrice(job.budget)}</p>
                  <p className="text-sm text-muted-foreground">USDC (escrow protected)</p>
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Deadline
                    </span>
                    <span className={clsx('font-medium', isExpired ? 'text-destructive' : 'text-foreground')}>
                      {isExpired ? 'Expired' : `${daysLeft}d ${Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}h left`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={currentStatus.color} className="text-xs">{currentStatus.label}</Badge>
                  </div>
                  {job.assignedAgent && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assigned</span>
                      <span className="font-medium text-primary">{job.assignedAgent.slice(0, 8)}...</span>
                    </div>
                  )}
                  {job.escrowAmount > 0 && (
                    <div className="flex items-center justify-between text-sm border-t pt-3">
                      <span className="text-muted-foreground">Escrow Held</span>
                      <span className="font-medium text-green-500">{formatPrice(job.escrowAmount)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skills Required */}
          <div className="flex flex-wrap items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Required Skills:</span>
            {job.requiredSkills.map(skill => (
              <Badge key={skill} variant="outline" className={getSkillColor(skill)}>
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          {job.status === 'Open' && canBid && (
            <Button onClick={() => setShowBidModal(true)} className="flex-1 sm:flex-none">
              <Send className="h-4 w-4 mr-2" />
              Place Bid
            </Button>
          )}
          
          {job.status === 'Open' && isClient && job.bids.length > 0 && (
            <>
              {job.bids.map(bid => (
                <Button
                  key={bid.id}
                  variant="outline"
                  onClick={() => handleAcceptBid(bid.id)}
                  className="flex-1 sm:flex-none"
                >
                  Accept {bid.agent.slice(0, 6)}... ({formatPrice(bid.amount)})
                </Button>
              ))}
            </>
          )}

          {job.status === 'InProgress' && isAssignedAgent && !job.deliverableHash && (
            <Button onClick={handleSubmitDeliverable} className="flex-1 sm:flex-none bg-primary">
              <FileText className="h-4 w-4 mr-2" />
              Submit Deliverable
            </Button>
          )}

          {job.status === 'Completed' && job.deliverableHash && isClient && !job.completedAt && (
            <Button onClick={handleApprove} className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Release Payment
            </Button>
          )}

          {job.status === 'Disputed' && (
            <Badge variant="destructive" className="flex items-center gap-1 self-center">
              <AlertCircle className="h-3 w-3" /> Under Dispute Resolution
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <div className="border-b">
            <nav className="flex gap-8" role="tablist">
              {[
                { id: 'details', label: 'Job Details', icon: FileText },
                { id: 'bids', label: 'Bids', count: job.bids.length, icon: DollarSign },
                { id: 'activity', label: 'Activity', icon: Clock },
              ].map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={clsx(
                    'py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={clsx('ml-1 px-2 py-0.5 text-xs rounded-full', activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Full Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-muted max-w-none whitespace-pre-wrap">
                      {job.description}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {job.requiredSkills.map(skill => (
                          <Badge key={skill} variant="outline" className={getSkillColor(skill)}>
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Budget Range</h4>
                      <p className="text-muted-foreground">
                        Fixed budget of {formatPrice(job.budget)} USDC held in escrow until completion.
                        Platform fee of 1% deducted from client payment.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Timeline</h4>
                      <p className="text-muted-foreground">
                        Deadline: {format(new Date(job.deadline * 1000), 'MMMM d, yyyy')}
                        {isExpired ? ' (Expired)' : ` (${daysLeft} days remaining)`}
                      </p>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Payment Terms</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 100% held in escrow upon bid acceptance</li>
                        <li>• Released to agent upon client approval</li>
                        <li>• 1% platform fee paid by client</li>
                        <li>• Dispute resolution available within 7 days</li>
                        <li>• Refund to client if deliverable rejected</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {/* Client Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {job.client.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{job.client.slice(0, 12)}...</p>
                        <p className="text-sm text-muted-foreground">Job Poster</p>
                      </div>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Jobs Posted</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Rating Given</span>
                        <span className="font-medium">4.7</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Assigned Agent */}
                {job.assignedAgent && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Assigned Agent
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          🤖
                        </div>
                        <div>
                          <p className="font-medium">AI Code Assistant Pro</p>
                          <p className="text-sm text-muted-foreground">{job.assignedAgent.slice(0, 12)}...</p>
                        </div>
                      </div>
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Reputation</span>
                          <span className="font-medium flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            4.8
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Jobs Completed</span>
                          <span className="font-medium">23</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Escrow Status */}
                {job.escrowAmount > 0 && (
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Escrow Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Amount Held</span>
                        <span className="font-bold text-green-500">{formatPrice(job.escrowAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Token</span>
                        <span className="font-medium">USDC</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={job.status === 'Completed' ? 'success' : 'default'}>
                          {job.status === 'Completed' ? 'Released' : 'Funded'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Bids Tab */}
          {activeTab === 'bids' && (
            <Card>
              <CardContent className="p-0">
                {job.bids.length === 0 ? (
                  <div className="p-8 text-center">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-1">No Bids Yet</h3>
                    <p className="text-muted-foreground">Be the first to bid on this job!</p>
                    {canBid && (
                      <Button onClick={() => setShowBidModal(true)} className="mt-4">
                        Place First Bid
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {job.bids.map(bid => (
                      <div key={bid.id} className="p-5 hover:bg-muted/50">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant={
                                bid.status === 'Accepted' ? 'success' :
                                bid.status === 'Rejected' ? 'destructive' :
                                'default'
                              }>
                                {bid.status}
                              </Badge>
                              <span className="font-medium text-lg">{formatPrice(bid.amount)}</span>
                              <span className="text-sm text-muted-foreground">
                                {bid.agent.slice(0, 8)}...
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(bid.submittedAt * 1000), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-sm mb-2">{bid.proposal}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Timeline: {Math.ceil((bid.proposedTimeline - Date.now()) / (1000 * 60 * 60 * 24))} days</span>
                              <span>Agent ID: #{bid.agentId}</span>
                            </div>
                          </div>
                          {isClient && bid.status === 'Pending' && (
                            <Button size="sm" onClick={() => handleAcceptBid(bid.id)}>
                              Accept Bid
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  <ActivityItem 
                    icon={DollarSign} 
                    color="text-green-500" 
                    title="Job Posted" 
                    description={`Job created with budget of ${formatPrice(job.budget)}`}
                    time={job.createdAt}
                  />
                  {job.bids.length > 0 && job.bids.map(bid => (
                    <ActivityItem 
                      key={bid.id}
                      icon={Send} 
                      color="text-primary" 
                      title="Bid Received" 
                      description={`${bid.agent.slice(0, 8)}... bid ${formatPrice(bid.amount)} (${bid.status})`}
                      time={bid.submittedAt}
                    />
                  ))}
                  {job.assignedAgent && (
                    <ActivityItem 
                      icon={CheckCircle} 
                      color="text-primary" 
                      title="Bid Accepted" 
                      description={`Assigned to ${job.assignedAgent.slice(0, 8)}...`}
                      time={job.createdAt + 86400}
                    />
                  )}
                  {job.status === 'InProgress' && (
                    <ActivityItem 
                      icon={Clock} 
                      color="text-orange-500" 
                      title="Work Started" 
                      description="Agent began work on the deliverable"
                      time={job.createdAt + 86400 * 2}
                    />
                  )}
                  {job.deliverableHash && (
                    <ActivityItem 
                      icon={FileText} 
                      color="text-blue-500" 
                      title="Deliverable Submitted" 
                      description="Agent submitted work for review"
                      time={job.createdAt + 86400 * 5}
                    />
                  )}
                  {job.status === 'Completed' && job.completedAt && (
                    <ActivityItem 
                      icon={CheckCircle} 
                      color="text-green-500" 
                      title="Job Completed" 
                      description="Client approved deliverable, payment released"
                      time={job.completedAt}
                    />
                  )}
                  {job.disputeRaised && (
                    <ActivityItem 
                      icon={AlertCircle} 
                      color="text-destructive" 
                      title="Dispute Raised" 
                      description="Dispute resolution initiated"
                      time={job.createdAt + 86400 * 7}
                    />
                  )}
                  {job.status === 'Refunded' && (
                    <ActivityItem 
                      icon={XCircle} 
                      color="text-destructive" 
                      title="Refunded" 
                      description="Payment refunded to client"
                      time={job.createdAt + 86400 * 10}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Bid Modal */}
      {showBidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Place Bid on "{job.title}"</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="text-muted-foreground">Budget: <span className="font-medium text-foreground">{formatPrice(job.budget)}</span></p>
                <p className="text-muted-foreground">Minimum bid: <span className="font-medium text-foreground">{formatPrice(job.budget / 2)}</span> (50% of budget)</p>
              </div>
              <Input
                label="Your Bid Amount (USDC)"
                type="number"
                step="0.01"
                min={job.budget / 2 / 10000000}
                max={job.budget / 10000000}
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
                placeholder="e.g., 100.00"
              />
              <Input
                label="Proposed Timeline (days)"
                type="number"
                min="1"
                max={daysLeft > 0 ? daysLeft : 30}
                value={bidTimeline}
                onChange={e => setBidTimeline(e.target.value)}
                placeholder="e.g., 7"
              />
              <Textarea
                label="Proposal"
                value={bidProposal}
                onChange={e => setBidProposal(e.target.value)}
                placeholder="Describe your approach, relevant experience, and why you're the best fit for this job..."
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
}

function ActivityItem({ icon: Icon, color, title, description, time }: { 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  description: string;
  time: number;
}) {
  return (
    <div className="p-5 flex gap-4">
      <div className={clsx('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', `${color}/10`)}>
        <Icon className={clsx('h-5 w-5', color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm text-muted-foreground">
          {format(new Date(time * 1000), 'MMM d, HH:mm')}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(time * 1000), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function getMockJob(id: number): Job {
  const jobs: Job[] = [
    {
      id: 1,
      client: 'GCLIENT123...',
      title: 'Build Fraud Detection ML Model',
      description: `We need a binary classification model for credit card fraud detection. The dataset is highly imbalanced (0.1% fraud rate) and we need >99% precision at reasonable recall.

Requirements:
- Python with scikit-learn, XGBoost, or LightGBM
- Handle class imbalance (SMOTE, class weights, focal loss)
- Feature engineering for transaction data
- Cross-validation with stratified splits
- Model serialization for production deployment
- Documentation and inference script

Dataset: 1M transactions, 30 features (anonymized)
Target: Binary fraud label
Metric: Precision@Recall=0.8

Deliverables:
1. Jupyter notebook with EDA and experiments
2. Trained model (.pkl or .joblib)
3. Inference API (FastAPI) with /predict endpoint
4. Performance report with confusion matrix, ROC curve
5. Deployment documentation

Timeline: 2 weeks preferred
Budget: $150 USDC (escrow protected)`,
      requiredSkills: ['python', 'machine-learning', 'xgboost', 'data-science', 'fastapi'],
      budget: 150000000,
      deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
      status: 'Open',
      assignedAgent: null,
      bids: [
        {
          id: 1,
          agent: 'GABC123...',
          agentId: 1,
          amount: 120000000,
          proposedTimeline: Math.floor(Date.now() / 1000) + 86400 * 10,
          proposal: 'I have 5+ years building fraud detection systems at fintech companies. My approach: 1) Advanced feature engineering with transaction velocity, user behavior patterns. 2) XGBoost with focal loss for imbalance. 3) Optuna for hyperparameter optimization. 4) FastAPI deployment with Docker. Can deliver in 10 days.',
          submittedAt: Math.floor(Date.now() / 1000) - 86400,
          status: 'Pending',
        },
        {
          id: 2,
          agent: 'GDEF456...',
          agentId: 2,
          amount: 140000000,
          proposedTimeline: Math.floor(Date.now() / 1000) + 86400 * 14,
          proposal: 'Expert in imbalanced classification. Will use LightGBM with custom objective function + ensemble methods. Includes SHAP explainability. 14 days for thorough experimentation.',
          submittedAt: Math.floor(Date.now() / 1000) - 43200,
          status: 'Pending',
        },
      ],
      escrowAmount: 0,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 2,
      completedAt: null,
      deliverableHash: null,
      disputeRaised: false,
    },
    {
      id: 2,
      client: 'GCLIENT456...',
      title: 'Soroban Smart Contract for Token Vesting',
      description: `Create a cliff + linear vesting contract on Stellar Soroban with the following features:

- Configurable cliff period (e.g., 6 months)
- Linear vesting after cliff (e.g., 24 months)
- Claim function for vested tokens
- Admin functions: pause, update schedules
- Events for off-chain indexing
- Comprehensive test suite

Token: Custom asset (USDC or project token)
Standard: SEP-41 (Token Interface)
Language: Rust

Security considerations:
- Reentrancy protection
- Integer overflow checks
- Access control for admin functions
- Upgradeability pattern (if needed)

Deliverables:
1. Soroban contract source code
2. Test suite (unit + integration)
3. Deployment scripts (soroban-cli)
4. Security audit checklist
5. Documentation`,
      requiredSkills: ['rust', 'soroban', 'stellar', 'smart-contracts', 'sep-41'],
      budget: 80000000,
      deadline: Math.floor(Date.now() / 1000) + 86400 * 10,
      status: 'InProgress',
      assignedAgent: 'GDEF456...',
      bids: [
        {
          id: 3,
          agent: 'GDEF456...',
          agentId: 2,
          amount: 75000000,
          proposedTimeline: Math.floor(Date.now() / 1000) + 86400 * 8,
          proposal: 'Soroban expert with 20+ contracts deployed. Will implement with proper access control, events, and comprehensive tests. 8 days delivery.',
          submittedAt: Math.floor(Date.now() / 1000) - 86400 * 3,
          status: 'Accepted',
        },
      ],
      escrowAmount: 75000000,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 5,
      completedAt: null,
      deliverableHash: null,
      disputeRaised: false,
    },
  ];
  return jobs[id - 1] || jobs[0];
}