import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Program {
  id: string;
  title: string;
  summary?: string;
}

interface ProgramSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgramSelected: (programId: string) => void;
}

export function ProgramSelectorDialog({ open, onOpenChange, onProgramSelected }: ProgramSelectorDialogProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchPrograms();
    }
  }, [open]);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, title, summary')
        .order('title');

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedProgramId) {
      onProgramSelected(selectedProgramId);
      onOpenChange(false);
      setSelectedProgramId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Seleccionar Programa</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona el programa al cual quieres agregar cursos:
            </p>
            
            <RadioGroup value={selectedProgramId} onValueChange={setSelectedProgramId}>
              {programs.map(program => (
                <div key={program.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value={program.id} id={program.id} />
                  <Label htmlFor={program.id} className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">{program.title}</p>
                      {program.summary && (
                        <p className="text-sm text-muted-foreground">{program.summary}</p>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {programs.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No hay programas disponibles. Crea un programa primero.
              </p>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleConfirm} 
                disabled={!selectedProgramId}
                className="flex-1"
              >
                Continuar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}