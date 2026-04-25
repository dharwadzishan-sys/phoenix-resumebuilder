"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Link2,
  Globe,
  Briefcase,
  GraduationCap,
  Code,
  FolderGit2,
  Plus,
  Trash2,
  Download,
  Eye,
  X,
  FileText,
  Upload,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { apiCall } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  college: string;
  degree: string;
  branch: string;
  year: string;
}

interface Project {
  title: string;
  techStack: string;
  description: string;
  link: string;
}

interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedIn: string;
  portfolio: string;
  profilePicUrl: string;
  professionalSummary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
}

const INITIAL_RESUME_DATA: ResumeData = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  github: "",
  linkedIn: "",
  portfolio: "",
  profilePicUrl: "",
  professionalSummary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

// ─── Steps Config ────────────────────────────────────────────────────────────

const STEPS = [
  { title: "Basic Info", icon: User },
  { title: "Summary", icon: FileText },
  { title: "Experience", icon: Briefcase },
  { title: "Education", icon: GraduationCap },
  { title: "Skills", icon: Code },
  { title: "Projects", icon: FolderGit2 },
] as const;

// ─── PDF Section Header Helper ────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{
        fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.16em",
        textTransform: "uppercase", color: "#1a2332",
        borderBottom: "2.5px solid #f59e0b",
        paddingBottom: "0.2rem", marginBottom: "0.65rem",
      }}>{label}</div>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResumeBuilder() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData>(INITIAL_RESUME_DATA);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  const { user, getToken } = useAuth();

  // ── Load saved resume data on mount ──────────────────────────────────────

  useEffect(() => {
    const loadResume = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken();
        const data = await apiCall("/api/resume/builder", { method: "GET", token });

        if (data.resume) {
          setResumeData({
            fullName: data.resume.fullName || "",
            email: data.resume.email || "",
            phone: data.resume.phone || "",
            location: data.resume.location || "",
            github: data.resume.github || "",
            linkedIn: data.resume.linkedIn || "",
            portfolio: data.resume.portfolio || "",
            profilePicUrl: data.resume.profilePicUrl || "",
            professionalSummary: data.resume.professionalSummary || "",
            experience: data.resume.experience || [],
            education: data.resume.education || [],
            skills: data.resume.skills || [],
            projects: data.resume.projects || [],
          });
        }
      } catch (err) {
        // 404 means no saved resume yet — that's fine
        if (err instanceof Error && !err.message.includes("404")) {
          setLoadError("Failed to load saved resume data.");
          console.error("Load resume error:", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadResume();
  }, [user, getToken]);

  // ── Field Updaters ───────────────────────────────────────────────────────

  const updateField = useCallback((field: keyof ResumeData, value: unknown) => {
    setResumeData((prev) => ({ ...prev, [field]: value }));
    setSaveStatus("idle");
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          alert("Image must be under 2MB");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          updateField("profilePicUrl", reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [updateField]
  );

  // ── Experience CRUD ──────────────────────────────────────────────────────

  const addExperience = useCallback(() => {
    updateField("experience", [
      ...resumeData.experience,
      { company: "", role: "", startDate: "", endDate: "", description: "" },
    ]);
  }, [resumeData.experience, updateField]);

  const updateExperience = useCallback(
    (index: number, field: keyof Experience, value: string) => {
      const updated = [...resumeData.experience];
      updated[index] = { ...updated[index], [field]: value };
      updateField("experience", updated);
    },
    [resumeData.experience, updateField]
  );

  const removeExperience = useCallback(
    (index: number) => {
      updateField("experience", resumeData.experience.filter((_, i) => i !== index));
    },
    [resumeData.experience, updateField]
  );

  // ── Education CRUD ───────────────────────────────────────────────────────

  const addEducation = useCallback(() => {
    updateField("education", [
      ...resumeData.education,
      { college: "", degree: "", branch: "", year: "" },
    ]);
  }, [resumeData.education, updateField]);

  const updateEducation = useCallback(
    (index: number, field: keyof Education, value: string) => {
      const updated = [...resumeData.education];
      updated[index] = { ...updated[index], [field]: value };
      updateField("education", updated);
    },
    [resumeData.education, updateField]
  );

  const removeEducation = useCallback(
    (index: number) => {
      updateField("education", resumeData.education.filter((_, i) => i !== index));
    },
    [resumeData.education, updateField]
  );

  // ── Skills ───────────────────────────────────────────────────────────────

  const addSkill = useCallback(
    (skill: string) => {
      if (skill.trim() && !resumeData.skills.includes(skill.trim())) {
        updateField("skills", [...resumeData.skills, skill.trim()]);
      }
    },
    [resumeData.skills, updateField]
  );

  const removeSkill = useCallback(
    (index: number) => {
      updateField("skills", resumeData.skills.filter((_, i) => i !== index));
    },
    [resumeData.skills, updateField]
  );

  // ── Projects CRUD ────────────────────────────────────────────────────────

  const addProject = useCallback(() => {
    updateField("projects", [
      ...resumeData.projects,
      { title: "", techStack: "", description: "", link: "" },
    ]);
  }, [resumeData.projects, updateField]);

  const updateProject = useCallback(
    (index: number, field: keyof Project, value: string) => {
      const updated = [...resumeData.projects];
      updated[index] = { ...updated[index], [field]: value };
      updateField("projects", updated);
    },
    [resumeData.projects, updateField]
  );

  const removeProject = useCallback(
    (index: number) => {
      updateField("projects", resumeData.projects.filter((_, i) => i !== index));
    },
    [resumeData.projects, updateField]
  );

  // ── Save to Firestore ────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!user) {
      alert("Please sign in to save your resume.");
      return;
    }

    setSaveStatus("saving");

    try {
      const token = await getToken();
      await apiCall("/api/resume/builder", {
        method: "POST",
        body: resumeData as unknown as Record<string, unknown>,
        token,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("Save resume error:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  }, [user, getToken, resumeData]);

  // ── Generate Resume (last step → show preview with loading) ──────────────

  const handleGenerateResume = useCallback(() => {
    setIsGeneratingPreview(true);
    // Simulate a brief generation delay for a polished feel
    setTimeout(() => {
      setShowPreview(true);
      setIsGeneratingPreview(false);
      // Smooth scroll to the preview after it renders
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }, 1200);
  }, []);

  // ── Export PDF ────────────────────────────────────────────────────────────

  const handleExportPDF = useCallback(() => {
    setShowPreview(true);
    // Give time for preview to render before printing
    setTimeout(() => window.print(), 300);
  }, []);

  // ── Loading State ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--primary)" }} />
        <p className="text-muted">Loading your resume data...</p>
      </div>
    );
  }

  // ── Step Content Renderers ───────────────────────────────────────────────

  const renderBasicInfo = () => (
    <div className="space-y-6">
      {/* Profile Picture */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {resumeData.profilePicUrl ? (
            <img
              src={resumeData.profilePicUrl}
              alt="Profile"
              className="w-28 h-28 rounded-full object-cover"
              style={{ border: "3px solid var(--primary)" }}
            />
          ) : (
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: "var(--muted)", border: "3px dashed var(--border)" }}
            >
              <User className="w-12 h-12" style={{ color: "var(--muted-foreground)" }} />
            </div>
          )}
          <label
            className="absolute bottom-0 right-0 p-2 rounded-full cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Upload a profile photo (max 2MB)
        </p>
      </div>

      {/* Form Fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            placeholder="John Doe"
            value={resumeData.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={resumeData.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            placeholder="+1 234 567 8900"
            value={resumeData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="New York, USA"
            value={resumeData.location}
            onChange={(e) => updateField("location", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="github">GitHub</Label>
          <Input
            id="github"
            placeholder="https://github.com/username"
            value={resumeData.github}
            onChange={(e) => updateField("github", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedIn">LinkedIn</Label>
          <Input
            id="linkedIn"
            placeholder="https://linkedin.com/in/username"
            value={resumeData.linkedIn}
            onChange={(e) => updateField("linkedIn", e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="portfolio">Portfolio</Label>
          <Input
            id="portfolio"
            placeholder="https://yourportfolio.com"
            value={resumeData.portfolio}
            onChange={(e) => updateField("portfolio", e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="summary">Professional Summary *</Label>
        <Textarea
          id="summary"
          placeholder="Write a brief summary about yourself, your experience, and what you're looking for..."
          value={resumeData.professionalSummary}
          onChange={(e) => updateField("professionalSummary", e.target.value)}
          rows={8}
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Tip: Keep it 3-5 sentences. Focus on your key strengths and career goals.
        </p>
      </div>
    </div>
  );

  const renderExperience = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Work Experience</h3>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Optional — skip if you&apos;re a fresher</p>
        </div>
        <Button onClick={addExperience} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      {resumeData.experience.length === 0 && (
        <div className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>
          <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No experience? No problem!</p>
          <p className="text-xs mt-1 opacity-70">Freshers can skip this step and move to the next.</p>
        </div>
      )}
      {resumeData.experience.map((exp, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg space-y-4"
          style={{ border: "1px solid var(--border)", background: "var(--card)" }}
        >
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-sm" style={{ color: "var(--primary)" }}>
              Experience {index + 1}
            </h4>
            <Button variant="ghost" size="icon" onClick={() => removeExperience(index)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                placeholder="Company Name"
                value={exp.company}
                onChange={(e) => updateExperience(index, "company", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                placeholder="Job Title"
                value={exp.role}
                onChange={(e) => updateExperience(index, "role", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="month"
                value={exp.startDate}
                onChange={(e) => updateExperience(index, "startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="month"
                value={exp.endDate}
                onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                placeholder="Leave empty for current"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your responsibilities and achievements..."
                value={exp.description}
                onChange={(e) => updateExperience(index, "description", e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderEducation = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Education</h3>
        <Button onClick={addEducation} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      {resumeData.education.length === 0 && (
        <div className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>
          <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No education added yet. Click &quot;Add&quot; to get started.</p>
        </div>
      )}
      {resumeData.education.map((edu, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg space-y-4"
          style={{ border: "1px solid var(--border)", background: "var(--card)" }}
        >
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-sm" style={{ color: "var(--primary)" }}>
              Education {index + 1}
            </h4>
            <Button variant="ghost" size="icon" onClick={() => removeEducation(index)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>College/University</Label>
              <Input
                placeholder="Institution Name"
                value={edu.college}
                onChange={(e) => updateEducation(index, "college", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Degree</Label>
              <Input
                placeholder="Bachelor's, Master's, etc."
                value={edu.degree}
                onChange={(e) => updateEducation(index, "degree", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Branch/Major</Label>
              <Input
                placeholder="Computer Science, etc."
                value={edu.branch}
                onChange={(e) => updateEducation(index, "branch", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                placeholder="2020-2024"
                value={edu.year}
                onChange={(e) => updateEducation(index, "year", e.target.value)}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderSkills = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Add Skills</Label>
        <div className="flex gap-2">
          <Input
            id="skill-input"
            placeholder="e.g., React, Node.js, Python"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const input = e.target as HTMLInputElement;
                addSkill(input.value);
                input.value = "";
              }
            }}
          />
          <Button
            onClick={() => {
              const input = document.getElementById("skill-input") as HTMLInputElement;
              if (input) {
                addSkill(input.value);
                input.value = "";
              }
            }}
          >
            Add
          </Button>
        </div>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Press Enter or click Add to add each skill
        </p>
      </div>

      {resumeData.skills.length === 0 && (
        <div className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>
          <Code className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No skills added yet.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {resumeData.skills.map((skill, index) => (
          <motion.div
            key={`${skill}-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
            style={{
              background: "var(--accent)",
              color: "var(--accent-foreground)",
              border: "1px solid var(--border)",
            }}
          >
            <span>{skill}</span>
            <button
              onClick={() => removeSkill(index)}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Projects</h3>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Optional — add your best work</p>
        </div>
        <Button onClick={addProject} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      {resumeData.projects.length === 0 && (
        <div className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>
          <FolderGit2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No projects yet? That&apos;s okay!</p>
          <p className="text-xs mt-1 opacity-70">You can skip this or add projects later.</p>
        </div>
      )}
      {resumeData.projects.map((project, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg space-y-4"
          style={{ border: "1px solid var(--border)", background: "var(--card)" }}
        >
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-sm" style={{ color: "var(--primary)" }}>
              Project {index + 1}
            </h4>
            <Button variant="ghost" size="icon" onClick={() => removeProject(index)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Project Title</Label>
              <Input
                placeholder="Project Name"
                value={project.title}
                onChange={(e) => updateProject(index, "title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tech Stack</Label>
              <Input
                placeholder="React, Node.js, MongoDB"
                value={project.techStack}
                onChange={(e) => updateProject(index, "techStack", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your project..."
                value={project.description}
                onChange={(e) => updateProject(index, "description", e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Project Link</Label>
              <Input
                placeholder="https://github.com/username/project"
                value={project.link}
                onChange={(e) => updateProject(index, "link", e.target.value)}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderBasicInfo();
      case 1: return renderSummary();
      case 2: return renderExperience();
      case 3: return renderEducation();
      case 4: return renderSkills();
      case 5: return renderProjects();
      default: return null;
    }
  };

  // ── Preview Renderer — Professional PDF Layout ───────────────────────────

  const renderPreview = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 print-target"
    >
      <div className="glass-panel">
        <h2 className="text-2xl font-bold mb-6 no-print">Resume Preview</h2>

        {/* ── A4 PDF Paper ──────────────────────────────────────────────── */}
        <div style={{
          background: "#fff",
          borderRadius: "6px",
          overflow: "hidden",
          boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          minHeight: "842px",           /* A4 proportional height */
        }}>

          {/* ── TOP HEADER BAND ─────────────────────────────────────────── */}
          <div style={{
            background: "#1a2332",
            color: "#fff",
            padding: "1.6rem 2rem",
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
          }}>
            {resumeData.profilePicUrl && (
              <img
                src={resumeData.profilePicUrl}
                alt="Profile"
                style={{
                  width: 70, height: 70, borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #f59e0b",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: "1.6rem", fontWeight: 800, margin: 0,
                color: "#fff", letterSpacing: "0.02em",
              }}>
                {resumeData.fullName || "Your Name"}
              </h1>
              {/* Contact strip */}
              <div style={{
                display: "flex", flexWrap: "wrap", gap: "0.9rem",
                marginTop: "0.5rem", fontSize: "0.73rem", color: "#94a3b8",
              }}>
                {resumeData.email && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Mail size={11} style={{ color: "#f59e0b" }} />{resumeData.email}
                  </span>
                )}
                {resumeData.phone && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Phone size={11} style={{ color: "#f59e0b" }} />{resumeData.phone}
                  </span>
                )}
                {resumeData.location && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <MapPin size={11} style={{ color: "#f59e0b" }} />{resumeData.location}
                  </span>
                )}
                {resumeData.github && (
                  <a href={resumeData.github} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#94a3b8", textDecoration: "none" }}>
                    <ExternalLink size={11} style={{ color: "#f59e0b" }} />GitHub
                  </a>
                )}
                {resumeData.linkedIn && (
                  <a href={resumeData.linkedIn} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#94a3b8", textDecoration: "none" }}>
                    <Link2 size={11} style={{ color: "#f59e0b" }} />LinkedIn
                  </a>
                )}
                {resumeData.portfolio && (
                  <a href={resumeData.portfolio} target="_blank" rel="noreferrer" style={{ color: "#555" }}>
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>


          {/* ── TWO-COLUMN PDF BODY ──────────────────────────────────────── */}
          <div style={{ display: "flex", minHeight: "700px" }}>

            {/* LEFT SIDEBAR — dark navy */}
            <div style={{
              width: "32%", flexShrink: 0,
              background: "#1a2332", color: "#e2e8f0",
              padding: "1.5rem 1.2rem",
            }}>

              {/* Skills */}
              {resumeData.skills.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{
                    fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.16em",
                    textTransform: "uppercase", color: "#f59e0b",
                    borderBottom: "2px solid #f59e0b",
                    paddingBottom: "0.25rem", marginBottom: "0.7rem",
                  }}>Skills</div>
                  {resumeData.skills.map((skill, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.3rem" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.73rem", color: "#cbd5e1", fontWeight: 500 }}>{skill}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Education */}
              {resumeData.education.length > 0 && (
                <div>
                  <div style={{
                    fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.16em",
                    textTransform: "uppercase", color: "#f59e0b",
                    borderBottom: "2px solid #f59e0b",
                    paddingBottom: "0.25rem", marginBottom: "0.7rem",
                  }}>Education</div>
                  {resumeData.education.map((edu, i) => (
                    <div key={i} style={{ marginBottom: "0.85rem" }}>
                      <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3 }}>
                        {edu.degree}{edu.branch ? ` in ${edu.branch}` : ""}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.15rem" }}>{edu.college}</div>
                      {edu.year && (
                        <div style={{
                          display: "inline-block", marginTop: "0.2rem",
                          fontSize: "0.63rem", color: "#fbbf24",
                          background: "rgba(251,191,36,0.12)", padding: "0.05rem 0.4rem",
                          borderRadius: "4px", border: "1px solid rgba(251,191,36,0.25)",
                        }}>{edu.year}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT MAIN COLUMN — white */}
            <div style={{ flex: 1, background: "#ffffff", color: "#1e293b", padding: "1.5rem 1.6rem" }}>

              {/* Profile / Summary */}
              {resumeData.professionalSummary && (
                <Section label="Profile">
                  <p style={{ fontSize: "0.76rem", lineHeight: 1.7, color: "#475569", margin: 0 }}>
                    {resumeData.professionalSummary}
                  </p>
                </Section>
              )}

              {/* Experience */}
              {resumeData.experience.length > 0 && (
                <Section label="Work Experience">
                  {resumeData.experience.map((exp, i) => (
                    <div key={i} style={{ marginBottom: "0.9rem", paddingLeft: "0.8rem", borderLeft: "3px solid #f59e0b" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>{exp.role || "Role"}</div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b", fontStyle: "italic" }}>{exp.company || "Company"}</div>
                        </div>
                        <span style={{
                          fontSize: "0.65rem", color: "#64748b", background: "#f1f5f9",
                          border: "1px solid #e2e8f0", padding: "0.1rem 0.4rem",
                          borderRadius: "4px", whiteSpace: "nowrap", flexShrink: 0,
                        }}>
                          {exp.startDate} — {exp.endDate || "Present"}
                        </span>
                      </div>
                      {exp.description && (
                        <p style={{ fontSize: "0.73rem", lineHeight: 1.65, color: "#475569", margin: "0.3rem 0 0" }}>
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {/* Projects */}
              {resumeData.projects.length > 0 && (
                <Section label="Projects">
                  {resumeData.projects.map((proj, i) => (
                    <div key={i} style={{ marginBottom: "0.9rem", paddingLeft: "0.8rem", borderLeft: "3px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>{proj.title || "Project"}</div>
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noreferrer"
                            style={{ fontSize: "0.67rem", color: "#f59e0b", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                            View →
                          </a>
                        )}
                      </div>
                      {proj.techStack && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem", margin: "0.2rem 0" }}>
                          {proj.techStack.split(",").map((t, ti) => (
                            <span key={ti} style={{
                              fontSize: "0.62rem", color: "#475569", background: "#f8fafc",
                              border: "1px solid #e2e8f0", padding: "0.05rem 0.35rem", borderRadius: "3px",
                            }}>{t.trim()}</span>
                          ))}
                        </div>
                      )}
                      {proj.description && (
                        <p style={{ fontSize: "0.73rem", lineHeight: 1.65, color: "#475569", margin: 0 }}>
                          {proj.description}
                        </p>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {/* Empty placeholder */}
              {!resumeData.professionalSummary && resumeData.experience.length === 0 && resumeData.projects.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
                  <FileText size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.35, display: "block" }} />
                  <p style={{ fontSize: "0.82rem", margin: 0 }}>Complete the form on the left to preview your resume.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );


  // ── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="resume-builder-root">
      {loadError && (
        <div
          className="mb-4 p-3 rounded-md flex items-center gap-2 text-sm"
          style={{ background: "var(--destructive)", color: "#fff" }}
        >
          <AlertCircle className="w-4 h-4" />
          {loadError}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left: Form (2 cols) ──────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="glass-panel no-print">
            {/* Step Indicators */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => setCurrentStep(index)}
                        className={cn(
                          "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
                          "resume-step-btn"
                        )}
                        style={{
                          background:
                            currentStep === index
                              ? "var(--primary)"
                              : currentStep > index
                              ? "#22c55e"
                              : "var(--muted)",
                          color:
                            currentStep === index
                              ? "var(--primary-foreground)"
                              : currentStep > index
                              ? "#fff"
                              : "var(--muted-foreground)",
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                      <span
                        className="text-xs hidden sm:block"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "var(--muted)" }}
              >
                <div
                  className="h-full transition-all duration-500 ease-out rounded-full"
                  style={{
                    width: `${((currentStep + 1) / STEPS.length) * 100}%`,
                    background: "linear-gradient(90deg, var(--primary), var(--chart-2))",
                  }}
                />
              </div>
            </div>

            {/* Animated Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>

            {/* Nav Buttons */}
            <div className="flex justify-between mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                ← Previous
              </Button>
              {currentStep === STEPS.length - 1 ? (
                <Button
                  onClick={handleGenerateResume}
                  disabled={isGeneratingPreview}
                  className="gap-2"
                  style={{
                    background: "linear-gradient(135deg, var(--primary), var(--chart-2))",
                    color: "var(--primary-foreground)",
                    minWidth: "180px",
                  }}
                >
                  {isGeneratingPreview ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" /> Generate Resume ✨
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
                >
                  Next →
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Actions Sidebar ──────────────────────────────────── */}
        <div className="lg:col-span-1 no-print">
          <div className="glass-panel sticky top-24">
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            <div className="space-y-3">
              {/* Save */}
              <Button
                className="w-full gap-2"
                onClick={handleSave}
                disabled={saveStatus === "saving" || !user}
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Saved!
                  </>
                ) : saveStatus === "error" ? (
                  <>
                    <AlertCircle className="w-4 h-4" /> Save Failed
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Resume
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
                  Sign in to save your resume
                </p>
              )}

              {/* Preview Toggle */}
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>

              {/* Export PDF */}
              <Button className="w-full gap-2" variant="outline" onClick={handleExportPDF}>
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </div>

            {/* Progress Sidebar */}
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
              <h4 className="text-sm font-semibold mb-3">Progress</h4>
              <div className="space-y-2">
                {STEPS.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className="flex items-center gap-2 w-full text-left py-1 px-2 rounded-md transition-colors hover:opacity-80"
                    style={{
                      background: currentStep === index ? "var(--accent)" : "transparent",
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full transition-colors"
                      style={{
                        background:
                          currentStep > index
                            ? "#22c55e"
                            : currentStep === index
                            ? "var(--primary)"
                            : "var(--border)",
                      }}
                    />
                    <span className="text-sm" style={{ color: "var(--foreground)" }}>
                      {step.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Completion Summary */}
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
              <h4 className="text-sm font-semibold mb-2">Completion</h4>
              <div className="space-y-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                <div className="flex justify-between">
                  <span>Name</span>
                  <span>{resumeData.fullName ? "✓" : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Summary</span>
                  <span>{resumeData.professionalSummary ? "✓" : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Experience</span>
                  <span>{resumeData.experience.length > 0 ? `${resumeData.experience.length} added` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Education</span>
                  <span>{resumeData.education.length > 0 ? `${resumeData.education.length} added` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Skills</span>
                  <span>{resumeData.skills.length > 0 ? `${resumeData.skills.length} added` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Projects</span>
                  <span>{resumeData.projects.length > 0 ? `${resumeData.projects.length} added` : "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Generating Loading Overlay ──────────────────────────────── */}
      {isGeneratingPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 flex flex-col items-center justify-center py-16 gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12" style={{ color: "var(--primary)" }} />
          </motion.div>
          <p className="text-lg font-medium" style={{ color: "var(--primary)" }}>
            Generating your resume...
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Putting your details together beautifully
          </p>
        </motion.div>
      )}

      {/* ── Preview Section ──────────────────────────────────────────── */}
      <div ref={previewRef}>
        {showPreview && !isGeneratingPreview && renderPreview()}
      </div>
    </div>
  );
}
