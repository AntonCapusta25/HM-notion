import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Info, Download, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Layout } from '@/components/Layout';

interface Run {
  id: number;
  status: string;
  conclusion: string;
  created_at: string;
  html_url: string;
}

interface Artifact {
  id: number;
  name: string;
  archive_download_url: string;
}

export default function LeadSearchPage() {
  const [queries, setQueries] = useState('');
  const [locations, setLocations] = useState('');
  const [limit, setLimit] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const { toast } = useToast();

  const githubToken = import.meta.env.VITE_GITHUB_ACTION_TOKEN;

  const fetchRecentRuns = async () => {
    if (!githubToken) return;
    setIsLoadingRuns(true);
    try {
      const response = await fetch('https://api.github.com/repos/AntonCapusta25/HM-notion/actions/workflows/lead_search.yml/runs?per_page=5', {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRecentRuns(data.workflow_runs || []);
      }
    } catch (e) {
      console.error('Failed to fetch runs', e);
    } finally {
      setIsLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchRecentRuns();
    const interval = setInterval(fetchRecentRuns, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [githubToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queries) {
      toast({
        title: "Missing input",
        description: "Please enter at least one query.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const queriesListStr = JSON.stringify(queries.split(',').map(q => q.trim()).filter(Boolean));
      const locationsListStr = locations ? JSON.stringify(locations.split(',').map(l => l.trim()).filter(Boolean)) : '[]';

      if (!githubToken) {
        throw new Error("VITE_GITHUB_ACTION_TOKEN is not set in your .env file.");
      }

      const response = await fetch('https://api.github.com/repos/AntonCapusta25/HM-notion/actions/workflows/lead_search.yml/dispatches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            queries: queriesListStr,
            locations: locationsListStr,
            limit: limit.toString()
          }
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${err}`);
      }

      toast({
        title: "Lead Search Started",
        description: "The GitHub Action has been triggered. It usually takes a few minutes.",
      });

      setQueries('');
      setLocations('');
      
      // Refresh runs list shortly after starting
      setTimeout(fetchRecentRuns, 3000);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error triggering search",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadArtifact = async (runId: number) => {
    try {
      toast({ title: "Fetching artifact..." });
      // 1. Get artifacts for run
      const artsRes = await fetch(`https://api.github.com/repos/AntonCapusta25/HM-notion/actions/runs/${runId}/artifacts`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });
      const artsData = await artsRes.json();
      const artifact = artsData.artifacts?.find((a: Artifact) => a.name === 'lead-search-results');

      if (!artifact) {
        throw new Error("No artifact found for this run. It may have failed or expired.");
      }

      // 2. Download zip blob
      const dlRes = await fetch(artifact.archive_download_url, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });
      
      if (!dlRes.ok) throw new Error("Failed to download artifact.");
      
      const blob = await dlRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lead_search_results_${runId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Download complete" });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Could not download artifact.",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Lead Search</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Find leads on Google Maps and automatically extract their emails from business websites.
              </p>
            </div>
          </div>

          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-homemade-orange" />
                Configure Search Parameters
              </CardTitle>
              <CardDescription>
                Enter topics/niches and locations to trigger the cloud scraper.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="queries">Search Queries (comma separated)</Label>
                  <Input 
                    id="queries" 
                    placeholder="e.g. software company, marketing agency, plumber" 
                    value={queries}
                    onChange={(e) => setQueries(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Minimum one query is required.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locations">Locations (comma separated) - Optional</Label>
                  <Input 
                    id="locations" 
                    placeholder="e.g. Amsterdam, London, New York" 
                    value={locations}
                    onChange={(e) => setLocations(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Info className="h-3 w-3" /> If left blank, searches internationally based on the query alone.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="limit">Max Results per Combination</Label>
                  <Input 
                    id="limit" 
                    type="number"
                    min={1}
                    max={200}
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                    disabled={isSubmitting}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-homemade-orange hover:bg-homemade-orange-dark text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting Search...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Trigger Lead Search
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Runs Section */}
          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  Recent Searches
                </div>
                {isLoadingRuns && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!githubToken ? (
                <p className="text-sm text-yellow-600">Please set VITE_GITHUB_ACTION_TOKEN in .env to view runs.</p>
              ) : recentRuns.length === 0 ? (
                <p className="text-sm text-gray-500">No recent searches found.</p>
              ) : (
                <div className="space-y-3">
                  {recentRuns.map((run) => (
                    <div key={run.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg outline-none hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {run.status === 'completed' ? (
                          run.conclusion === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )
                        ) : (
                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        )}
                        <div>
                          <p className="text-sm font-medium dark:text-gray-200">
                            Run #{run.id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(run.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {run.status === 'completed' && run.conclusion === 'success' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDownloadArtifact(run.id)}
                            className="bg-white dark:bg-gray-900"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Results.zip
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <a href={run.html_url} target="_blank" rel="noreferrer">
                            View Logs
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
