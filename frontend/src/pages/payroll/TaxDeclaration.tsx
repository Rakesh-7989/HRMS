import React, { useEffect, useState } from 'react';

import { taxService, TaxSection, TaxRegime, ITDeclaration } from '@/services/finance/tax.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FileText, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const TaxDeclaration: React.FC = () => {
    const [activeTab, setActiveTab] = useState('regime');
    const [fy] = useState('2024-2025'); // Default FY, could be dynamic
    const [regime, setRegime] = useState<TaxRegime | null>(null);
    const [sections, setSections] = useState<TaxSection[]>([]);
    const [declarations, setDeclarations] = useState<ITDeclaration[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState<string>('');
    const [editLink, setEditLink] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, [fy]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [regimeData, sectionsData, declarationsData] = await Promise.all([
                taxService.getRegime(fy),
                taxService.getSections(),
                taxService.getDeclarations(fy)
            ]);
            setRegime(regimeData);
            setSections(sectionsData);
            setDeclarations(declarationsData);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load tax data');
        } finally {
            setLoading(false);
        }
    };

    const handleRegimeChange = async (newRegime: 'OLD' | 'NEW') => {
        try {
            await taxService.setRegime(fy, newRegime);
            setRegime({ ...regime!, regime: newRegime });
            toast.success(`Tax regime updated to ${newRegime}`);
        } catch (error) {
            toast.error('Failed to update regime');
        }
    };

    const handleSaveDeclaration = async (sectionId: string) => {
        if (!editAmount) return;

        const existingDecl = declarations.find(d => d.section_id === sectionId);

        try {
            await taxService.upsertDeclaration({
                id: existingDecl?.id,
                sectionId,
                financialYear: fy,
                declaredAmount: parseFloat(editAmount),
                proofUrl: editLink
            });
            toast.success('Declaration saved');
            setEditingId(null);
            setEditAmount('');
            setEditLink('');
            fetchData(); // Refresh to show pending status
        } catch (error) {
            toast.error('Failed to save declaration');
        }
    };

    const handleDownloadForm16 = async () => {
        try {
            toast.loading('Generating Form 16...');
            await taxService.downloadForm16(fy);
            toast.dismiss();
            toast.success('Form 16 downloaded');
        } catch (error) {
            toast.dismiss();
            toast.error('Failed to download Form 16');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Tax Data...</div>;

    // Group declarations by section
    const getDeclaration = (sectionId: string) => declarations.find(d => d.section_id === sectionId);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Tax Planning & Compliance
                    </h2>
                    <p className="text-muted-foreground">Manage your tax regime and investment declarations for FY {fy}</p>
                </div>
                <div className="flex gap-2">
                    {/* FY Selector could go here */}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="regime">Regime Selection</TabsTrigger>
                    <TabsTrigger value="declarations">IT Declarations</TabsTrigger>
                    <TabsTrigger value="form16">Form 16</TabsTrigger>
                </TabsList>

                {/* --- REGIME SELECTION --- */}
                <TabsContent value="regime" className="mt-6 space-y-4">
                    <Card className="p-6 border-l-4 border-l-primary">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Current Regime: <span className="text-primary">{regime?.regime || 'Not Selected'}</span></h3>
                                <p className="text-sm text-gray-500 max-w-xl">
                                    The <strong>New Regime</strong> offers lower tax rates but disallows most exemptions (HRA, 80C, etc.).
                                    The <strong>Old Regime</strong> allows claiming exemptions but has higher slab rates.
                                </p>
                            </div>
                            {regime?.is_frozen ? (
                                <Badge variant="secondary">Selection Frozen</Badge>
                            ) : (
                                <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                    <button
                                        onClick={() => handleRegimeChange('OLD')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${regime?.regime === 'OLD' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Old Regime
                                    </button>
                                    <button
                                        onClick={() => handleRegimeChange('NEW')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${regime?.regime === 'NEW' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        New Regime
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Why Choose Old Regime?</h4>
                            <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-400 space-y-1">
                                <li>If you have high HRA (Rent)</li>
                                <li>If you invest heavily in 80C (LIC, PF, PPF)</li>
                                <li>If you have Education Loan or Medical Insurance</li>
                            </ul>
                        </Card>
                        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
                            <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">Why Choose New Regime?</h4>
                            <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-400 space-y-1">
                                <li>Lower tax rates for income up to ₹15L</li>
                                <li>Simple tax filing, no proof submission needed</li>
                                <li>Standard Deduction of ₹50,000 is allowed</li>
                            </ul>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- IT DECLARATIONS --- */}
                <TabsContent value="declarations" className="mt-6">
                    {regime?.regime === 'NEW' && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3 text-yellow-800">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <div>
                                <h4 className="font-semibold">You have selected New Regime</h4>
                                <p className="text-sm">Most tax declarations (Section 80C, 80D, HRA) are NOT applicable in the New Regime. You can still submit them if you plan to switch to Old Regime before the cutoff.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-6">
                        {sections.map(section => {
                            const declaration = getDeclaration(section.id);
                            const isEditing = editingId === section.id;

                            return (
                                <Card key={section.id} className="p-6 transition-all hover:shadow-lg">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="font-mono">{section.section}</Badge>
                                                <h3 className="font-semibold text-lg">{section.name}</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">{section.description}</p>
                                            {section.max_limit && (
                                                <p className="text-xs text-gray-500">Max Limit: ₹{section.max_limit.toLocaleString()}</p>
                                            )}
                                        </div>

                                        <div className="flex-1 md:text-right">
                                            {isEditing ? (
                                                <div className="flex flex-col gap-2 items-end">
                                                    <div className="flex items-center gap-2 w-full max-w-xs">
                                                        <Label>Amount:</Label>
                                                        <Input
                                                            type="number"
                                                            value={editAmount}
                                                            onChange={e => setEditAmount(e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 w-full max-w-xs">
                                                        <Label>Proof URL:</Label>
                                                        <Input
                                                            placeholder="Google Drive / S3 Link"
                                                            value={editLink}
                                                            onChange={e => setEditLink(e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                                        <Button size="sm" onClick={() => handleSaveDeclaration(section.id)}>Save</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-2">
                                                    {declaration ? (
                                                        <>
                                                            <div className="text-2xl font-bold">₹{parseFloat(declaration.declared_amount as any).toLocaleString()}</div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge className={
                                                                    declaration.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                                        declaration.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                                            'bg-yellow-100 text-yellow-800'
                                                                }>
                                                                    {declaration.status}
                                                                </Badge>
                                                                {declaration.approved_amount > 0 && declaration.status === 'APPROVED' && (
                                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3 h-3" /> Approved: ₹{declaration.approved_amount}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <Button size="sm" variant="outline" onClick={() => {
                                                                setEditingId(section.id);
                                                                setEditAmount(declaration.declared_amount.toString());
                                                                setEditLink(declaration.proof_url || '');
                                                            }}>Edit</Button>
                                                        </>
                                                    ) : (
                                                        <Button size="sm" onClick={() => {
                                                            setEditingId(section.id);
                                                            setEditAmount('');
                                                            setEditLink('');
                                                        }}>
                                                            + Declare
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* --- FORM 16 --- */}
                <TabsContent value="form16" className="mt-6">
                    <Card className="p-8 text-center bg-gray-50 dark:bg-gray-800/50">
                        <FileText className="w-16 h-16 mx-auto text-primary mb-4 opacity-80" />
                        <h3 className="text-xl font-bold mb-2">Form 16 (Part B)</h3>
                        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                            Download your Form 16 Part B for the financial year {fy}.
                            This document certifies your income chargeable under "Salaries" and tax deducted at source.
                        </p>

                        <div className="flex justify-center gap-4">
                            <Button onClick={handleDownloadForm16} className="h-12 px-8 text-lg gap-2">
                                <Download className="w-5 h-5" /> Download PDF
                            </Button>
                        </div>

                        <p className="text-xs text-gray-400 mt-6">
                            Note: Part A of Form 16 (TRACES generated) will be shared separately by the Finance team.
                        </p>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
