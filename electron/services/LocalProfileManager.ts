import { app, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SettingsManager } from './SettingsManager';

export interface LocalProfileData {
  hasResume: boolean;
  fileName?: string;
  sourcePath?: string;
  storedPath?: string;
  uploadedAt?: string;
  name?: string;
  role?: string;
  totalExperienceYears?: number;
  skills: string[];
  keywords: string[];
  chunks: string[];
  resumeText: string;
}

export interface LocalProfileContextResult {
  shouldInject: boolean;
  reason: 'disabled' | 'no_resume' | 'text_relevant' | 'image_conditional' | 'not_relevant';
  contextBlock?: string;
}

const EMPTY_PROFILE: LocalProfileData = {
  hasResume: false,
  skills: [],
  keywords: [],
  chunks: [],
  resumeText: '',
};

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'answer', 'because', 'before', 'being', 'below', 'could',
  'does', 'from', 'have', 'into', 'just', 'like', 'more', 'next', 'only', 'question', 'really',
  'should', 'that', 'their', 'there', 'these', 'this', 'those', 'through', 'what', 'when',
  'where', 'which', 'while', 'with', 'would', 'your', 'youre', 'user', 'using', 'please',
  'give', 'tell', 'make', 'need', 'want', 'write', 'show', 'explain',
]);

const PROFILE_INTENT_PATTERNS = [
  /\bresume\b/i,
  /\bcv\b/i,
  /\bbackground\b/i,
  /\bexperience\b/i,
  /\bproject(s)?\b/i,
  /\bskill(s)?\b/i,
  /\bstrength(s)?\b/i,
  /\bweakness(es)?\b/i,
  /\bachievement(s)?\b/i,
  /\bleadership\b/i,
  /\bconflict\b/i,
  /\bchallenge\b/i,
  /\bfailure\b/i,
  /\bhire you\b/i,
  /\btell me about yourself\b/i,
  /\bwhy (are|were|do|did|should|this role|this company)\b/i,
  /\bbehavioral\b/i,
  /\bsituation where\b/i,
  /\btime when\b/i,
  /\bworked on\b/i,
  /\bprevious role\b/i,
];

const COMMON_SKILLS = [
  'react', 'typescript', 'javascript', 'node', 'node.js', 'electron', 'firebase', 'python',
  'java', 'spring', 'c#', '.net', 'go', 'golang', 'rust', 'sql', 'postgres', 'mysql',
  'mongodb', 'redis', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
  'graphql', 'rest', 'api', 'tailwind', 'vite', 'next.js', 'angular', 'vue', 'redux',
  'express', 'fastapi', 'django', 'flask', 'microservices', 'system design', 'llm',
  'openai', 'gemini', 'machine learning', 'data engineering', 'devops', 'ci/cd',
];

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3 && !STOP_WORDS.has(token));
}

function uniqueSorted(items: string[], limit: number): string[] {
  return Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b)).slice(0, limit);
}

function scoreChunk(chunk: string, terms: Set<string>): number {
  if (terms.size === 0) return 0;
  const lower = chunk.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (lower.includes(term)) score += term.length > 6 ? 2 : 1;
  }
  return score;
}

function scoreProfileIntent(chunk: string, query: string): number {
  let score = 0;

  if (/\b(project|projects|portfolio|worked on|built)\b/i.test(query)) {
    if (/\b(project|projects|portfolio)\b/i.test(chunk)) score += 10;
    if (/\b(app|application|platform|module|feature)\b/i.test(chunk)) score += 2;
  }

  if (/\b(experience|employment|work history|previous role|years|yrs)\b/i.test(query)) {
    if (/\b(work experience|employment|professional experience)\b/i.test(chunk)) score += 8;
    if (/\b(?:19|20)\d{2}\b/.test(chunk)) score += 2;
  }

  return score;
}

export class LocalProfileManager {
  private static instance: LocalProfileManager | null = null;
  private readonly profileDir: string;
  private readonly profilePath: string;
  private readonly sourceDir: string;
  private profile: LocalProfileData = { ...EMPTY_PROFILE };

  private constructor() {
    this.profileDir = path.join(app.getPath('userData'), 'local-profile');
    this.sourceDir = path.join(this.profileDir, 'sources');
    this.profilePath = path.join(this.profileDir, 'resume-profile.json');
    this.ensureDirs();
    this.load();
  }

  public static getInstance(): LocalProfileManager {
    if (!LocalProfileManager.instance) {
      LocalProfileManager.instance = new LocalProfileManager();
    }
    return LocalProfileManager.instance;
  }

  public getStatus(): { hasProfile: boolean; profileMode: boolean; name?: string; role?: string; totalExperienceYears?: number } {
    return {
      hasProfile: this.profile.hasResume,
      profileMode: this.isEnabled(),
      name: this.profile.name,
      role: this.profile.role,
      totalExperienceYears: this.profile.totalExperienceYears,
    };
  }

  public getProfileData(): any {
    return {
      hasProfile: this.profile.hasResume,
      hasResume: this.profile.hasResume,
      fileName: this.profile.fileName,
      name: this.profile.name,
      role: this.profile.role,
      totalExperienceYears: this.profile.totalExperienceYears,
      skills: this.profile.skills,
      experienceCount: this.countSectionMatches(/\b(experience|employment|work history|professional)\b/i),
      projectCount: this.countSectionMatches(/\b(project|portfolio)\b/i),
      nodeCount: this.profile.chunks.length,
      uploadedAt: this.profile.uploadedAt,
      source: 'local',
    };
  }

  public setMode(enabled: boolean): void {
    SettingsManager.getInstance().set('knowledgeMode', enabled);
  }

  public async uploadResume(filePath: string): Promise<{ success: boolean; error?: string }> {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Resume file not found.' };
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!['.pdf', '.docx', '.doc', '.txt', '.md'].includes(ext)) {
      return { success: false, error: 'Unsupported resume format. Use PDF, DOCX, DOC, TXT, or MD.' };
    }

    try {
      const resumeText = normalizeText(await this.extractText(filePath, ext));
      if (resumeText.length < 80) {
        return { success: false, error: 'Could not read enough text from this resume. Try a text-based PDF, DOCX, or TXT file.' };
      }

      const storedPath = this.copySourceFile(filePath);
      this.profile = this.buildProfile(filePath, storedPath, resumeText);
      this.save();
      this.setMode(true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Resume upload failed.' };
    }
  }

  public deleteResume(): void {
    if (this.profile.storedPath && fs.existsSync(this.profile.storedPath)) {
      try {
        fs.unlinkSync(this.profile.storedPath);
      } catch {
        // Non-fatal: the profile JSON is the source of truth for this feature.
      }
    }
    this.profile = { ...EMPTY_PROFILE };
    this.save();
    this.setMode(false);
  }

  public async openResume(): Promise<{ success: boolean; error?: string }> {
    const storedPath = this.profile.storedPath;
    if (!storedPath || !fs.existsSync(storedPath)) {
      return { success: false, error: 'No uploaded resume file found.' };
    }

    const error = await shell.openPath(storedPath);
    if (error) {
      return { success: false, error };
    }
    return { success: true };
  }

  public buildContextForRequest(params: { message?: string; context?: string; hasImages?: boolean }): LocalProfileContextResult {
    if (!this.isEnabled()) return { shouldInject: false, reason: 'disabled' };
    if (!this.profile.hasResume || !this.profile.resumeText.trim()) return { shouldInject: false, reason: 'no_resume' };

    const query = normalizeText([params.message, params.context].filter(Boolean).join('\n\n'));
    const relevance = this.getRelevance(query);
    const hasImages = Boolean(params.hasImages);

    if (!relevance.isRelevant && !hasImages) {
      return { shouldInject: false, reason: 'not_relevant' };
    }

    const reason = relevance.isRelevant ? 'text_relevant' : 'image_conditional';
    return {
      shouldInject: true,
      reason,
      contextBlock: this.buildContextBlock(query, reason === 'image_conditional'),
    };
  }

  private isEnabled(): boolean {
    return SettingsManager.getInstance().get('knowledgeMode') === true;
  }

  private ensureDirs(): void {
    fs.mkdirSync(this.sourceDir, { recursive: true });
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.profilePath)) {
        this.profile = { ...EMPTY_PROFILE };
        return;
      }
      const parsed = JSON.parse(fs.readFileSync(this.profilePath, 'utf8'));
      const resumeText = typeof parsed.resumeText === 'string' ? normalizeText(parsed.resumeText) : '';
      this.profile = {
        ...EMPTY_PROFILE,
        ...parsed,
        resumeText,
      };

      // Derived fields are intentionally rebuilt on load. This lets parser and
      // retrieval fixes apply to already-uploaded resumes without making users
      // delete and upload the same file again.
      if (this.profile.hasResume && resumeText) {
        const lines = resumeText.split('\n').map(line => line.trim()).filter(Boolean);
        const skills = this.extractSkills(resumeText);
        this.profile = {
          ...this.profile,
          name: this.extractName(lines),
          role: this.extractRole(lines),
          totalExperienceYears: this.extractExperienceYears(resumeText),
          skills,
          keywords: uniqueSorted([...skills, ...tokenize(resumeText).filter(token => token.length > 4)], 220),
          chunks: this.chunkResume(resumeText),
        };
        this.save();
      } else {
        this.profile.skills = [];
        this.profile.keywords = [];
        this.profile.chunks = [];
      }
    } catch (error) {
      console.warn('[LocalProfileManager] Failed to load local profile:', error);
      this.profile = { ...EMPTY_PROFILE };
    }
  }

  private save(): void {
    this.ensureDirs();
    const tmpPath = `${this.profilePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.profile, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.profilePath);
  }

  public async selectSessionReference(): Promise<{ success: boolean; cancelled?: boolean; document?: { name: string; content: string }; error?: string }> {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog({
        title: 'Choose a reference document',
        properties: ['openFile'],
        filters: [{ name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] }],
      });
      if (result.canceled || !result.filePaths[0]) return { success: false, cancelled: true };
      const filePath = result.filePaths[0];
      const ext = path.extname(filePath).toLowerCase();
      if (!['.pdf', '.docx', '.txt', '.md'].includes(ext)) throw new Error('Choose a PDF, DOCX, TXT or Markdown file.');
      if (fs.statSync(filePath).size > 10 * 1024 * 1024) throw new Error('Choose a document smaller than 10 MB.');
      const content = normalizeText(await this.extractText(filePath, ext)).slice(0, 3000);
      if (!content) throw new Error('This document has no readable text. Try a text-based document.');
      return { success: true, document: { name: path.basename(filePath), content } };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Could not read document.' };
    }
  }

  private async extractText(filePath: string, ext: string): Promise<string> {
    if (ext === '.pdf') {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: fs.readFileSync(filePath) });
      try {
        const result = await parser.getText();
        return result?.text || '';
      } finally {
        await parser.destroy().catch(() => {});
      }
    }

    if (ext === '.docx' || ext === '.doc') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result?.value || '';
    }

    return fs.readFileSync(filePath, 'utf8');
  }

  private copySourceFile(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const hash = crypto.createHash('sha256').update(`${filePath}:${Date.now()}`).digest('hex').slice(0, 12);
    const storedPath = path.join(this.sourceDir, `resume-${hash}${ext}`);
    fs.copyFileSync(filePath, storedPath);
    return storedPath;
  }

  private buildProfile(sourcePath: string, storedPath: string, resumeText: string): LocalProfileData {
    const lines = resumeText.split('\n').map(line => line.trim()).filter(Boolean);
    const name = this.extractName(lines);
    const role = this.extractRole(lines);
    const skills = this.extractSkills(resumeText);
    const keywords = uniqueSorted([...skills, ...tokenize(resumeText).filter(token => token.length > 4)], 220);
    const chunks = this.chunkResume(resumeText);

    return {
      hasResume: true,
      fileName: path.basename(sourcePath),
      sourcePath,
      storedPath,
      uploadedAt: new Date().toISOString(),
      name,
      role,
      totalExperienceYears: this.extractExperienceYears(resumeText),
      skills,
      keywords,
      chunks,
      resumeText,
    };
  }

  private extractName(lines: string[]): string | undefined {
    const candidate = lines.find(line => {
      if (line.length > 80) return false;
      if (/@|https?:|www\.|\+?\d{7,}/i.test(line)) return false;
      const words = line.split(/\s+/);
      return words.length >= 2 && words.length <= 5 && words.every(word => /^[A-Za-z][A-Za-z.'-]*$/.test(word));
    });
    return candidate;
  }

  private extractRole(lines: string[]): string | undefined {
    const rolePattern = /\b(engineer|developer|designer|manager|analyst|architect|consultant|specialist|lead|intern|scientist|administrator|product|sales|marketing|recruiter)\b/i;
    return lines.find(line => line.length <= 100 && rolePattern.test(line));
  }

  private extractExperienceYears(text: string): number | undefined {
    const direct = text.match(/\b(\d{1,2}(?:\.\d+)?)\s*\+?\s*(?:years|yrs)\s+(?:of\s+)?experience\b/i);
    if (direct) return Number(direct[1]);

    // Do not derive a total from every four-digit year in the document.
    // Education, certifications, and project dates otherwise inflate the
    // result and turn an uncertain estimate into a confident wrong answer.
    return undefined;
  }

  private extractSkills(text: string): string[] {
    const lower = text.toLowerCase();
    const skills = COMMON_SKILLS.filter(skill => lower.includes(skill.toLowerCase()));
    const skillsSection = text.match(/(?:skills|technologies|technical skills)[:\n]+([\s\S]{0,1200})/i)?.[1] || '';
    const sectionSkills = skillsSection
      .split(/[,|•\n;/]+/)
      .map(item => item.trim())
      .filter(item => item.length >= 2 && item.length <= 35 && /[A-Za-z]/.test(item));
    return uniqueSorted([...skills, ...sectionSkills], 40);
  }

  private chunkResume(text: string): string[] {
    const MAX_CHUNK_CHARS = 1100;
    const paragraphs = text.split(/\n\s*\n+/).map(part => part.trim()).filter(Boolean);
    const units = paragraphs.flatMap(paragraph => {
      if (paragraph.length <= MAX_CHUNK_CHARS) return [paragraph];

      // PDF extraction commonly returns a whole page as one paragraph with
      // single line breaks. Split those pages before retrieval so content near
      // the end (often Projects and recent Experience) is not truncated away.
      const lines = paragraph.split('\n').map(line => line.trim()).filter(Boolean);
      return lines.length > 1 ? lines : paragraph.match(/.{1,1000}(?:\s+|$)/g)?.map(part => part.trim()) || [paragraph];
    });
    const chunks: string[] = [];
    let current = '';

    for (const unit of units) {
      if ((current + '\n' + unit).length > MAX_CHUNK_CHARS && current) {
        chunks.push(current);
        current = unit;
      } else {
        current = current ? `${current}\n${unit}` : unit;
      }
    }
    if (current) chunks.push(current);

    if (chunks.length > 0) return chunks.slice(0, 40);

    const fallback: string[] = [];
    for (let i = 0; i < text.length; i += MAX_CHUNK_CHARS) {
      fallback.push(text.slice(i, i + MAX_CHUNK_CHARS));
    }
    return fallback.slice(0, 40);
  }

  private getRelevance(query: string): { isRelevant: boolean; score: number } {
    if (!query.trim()) return { isRelevant: false, score: 0 };

    let score = 0;
    if (PROFILE_INTENT_PATTERNS.some(pattern => pattern.test(query))) score += 3;

    const queryTerms = new Set(tokenize(query));
    for (const skill of this.profile.skills) {
      if (query.toLowerCase().includes(skill.toLowerCase())) score += 2;
    }
    for (const keyword of this.profile.keywords.slice(0, 160)) {
      if (queryTerms.has(keyword.toLowerCase())) score += 1;
    }

    return { isRelevant: score >= 3, score };
  }

  private buildContextBlock(query: string, conditionalOnly: boolean): string {
    const terms = new Set(tokenize(query));
    const rankedChunks = this.profile.chunks
      .map(chunk => ({ chunk, score: scoreChunk(chunk, terms) + scoreProfileIntent(chunk, query) }))
      .sort((a, b) => b.score - a.score);

    const selectedChunks = rankedChunks
      .filter(item => item.score > 0)
      .slice(0, 4)
      .map(item => item.chunk);

    if (selectedChunks.length === 0) {
      selectedChunks.push(...this.profile.chunks.slice(0, conditionalOnly ? 2 : 3));
    }

    const details = [
      this.profile.name ? `Name: ${this.profile.name}` : '',
      this.profile.role ? `Role/headline: ${this.profile.role}` : '',
      this.profile.totalExperienceYears !== undefined
        ? `Resume-stated total experience: ${this.profile.totalExperienceYears} years`
        : '',
      this.profile.skills.length ? `Skills: ${this.profile.skills.slice(0, 24).join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const snippets = selectedChunks
      .map((chunk, index) => `<resume_snippet index="${index + 1}">\n${chunk.slice(0, 1200)}\n</resume_snippet>`)
      .join('\n\n');

    return `<candidate_profile_context source="local_resume">
Use this local resume context only when the current user request, transcript, or screenshot is about the user's background, work experience, projects, skills, interview fit, behavioral stories, or career history.
If the current request is unrelated, ignore this block completely and answer normally using the active AI behavior rules.
Never say "based on your resume" or reveal that this context was injected. Speak naturally in first person when using it.
This context describes the user/candidate, not the AI assistant. For personal interview questions, answer as the candidate and never substitute the AI assistant's biography or generic example projects.
Treat resume facts as authoritative. Preserve names, dates, durations, and numeric values exactly; do not round or invent them.
For project questions, name the actual projects and explain only the contributions present in the snippets. If the requested fact is absent, say so briefly instead of fabricating it.

${details}

${snippets}
</candidate_profile_context>`;
  }

  private countSectionMatches(pattern: RegExp): number {
    if (!this.profile.hasResume) return 0;
    return this.profile.chunks.filter(chunk => pattern.test(chunk)).length;
  }
}
