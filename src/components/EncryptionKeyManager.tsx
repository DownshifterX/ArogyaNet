import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Key, Copy, Download, Upload, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import {
  getStoredKeys,
  generateEncryptionKey,
  saveEncryptionKey,
  exportKey,
  importKey,
  deleteEncryptionKey,
  isStorageAvailable,
  type EncryptionKey,
} from "@/utils/encryption";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EncryptionKeyManager() {
  const [keys, setKeys] = useState<EncryptionKey[]>([]);
  const [importText, setImportText] = useState("");
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = () => {
    const storedKeys = getStoredKeys();
    setKeys(storedKeys);
  };

  const handleGenerateKey = () => {
    try {
      const newKey = generateEncryptionKey(`Key ${keys.length + 1}`);
      saveEncryptionKey(newKey);
      loadKeys();
      toast({
        title: "Key Generated",
        description: "New encryption key created successfully",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate key",
        variant: "destructive",
      });
    }
  };

  const handleExportKey = (keyId: string) => {
    try {
      const exported = exportKey(keyId);
      if (!exported) {
        throw new Error("Key not found");
      }
      
      // Copy to clipboard
      navigator.clipboard.writeText(exported);
      
      // Also trigger download
      const blob = new Blob([exported], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `encryption-key-${keyId.substring(0, 8)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Key Exported",
        description: "Key copied to clipboard and downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export key",
        variant: "destructive",
      });
    }
  };

  const handleImportKey = () => {
    try {
      if (!importText.trim()) {
        throw new Error("Please enter a key to import");
      }
      
      importKey(importText.trim());
      loadKeys();
      setImportText("");
      toast({
        title: "Key Imported",
        description: "Encryption key imported successfully",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Invalid key format",
        variant: "destructive",
      });
    }
  };

  const handleDeleteKey = (keyId: string) => {
    setDeleteKeyId(keyId);
  };

  const confirmDeleteKey = () => {
    if (!deleteKeyId) return;
    
    try {
      deleteEncryptionKey(deleteKeyId);
      loadKeys();
      toast({
        title: "Key Deleted",
        description: "Encryption key removed successfully",
      });
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete key",
        variant: "destructive",
      });
    } finally {
      setDeleteKeyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Encryption Key Management
          </CardTitle>
          <CardDescription>
            Manage your encryption keys for secure document storage. Keep backups safe!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Storage Check Warning */}
          {!isStorageAvailable() && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Storage Not Available
                </p>
                <p className="text-red-800 dark:text-red-200">
                  Your browser storage is not working. You may be in Private/Incognito mode, or storage may be full. 
                  Please use regular browsing mode to manage encryption keys.
                </p>
              </div>
            </div>
          )}
          
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Important: Keep Your Keys Safe
              </p>
              <p className="text-amber-800 dark:text-amber-200">
                If you lose your encryption keys, you will NOT be able to decrypt your documents.
                Export and securely back up your keys. On mobile, keys may be cleared if you clear browser data.
              </p>
            </div>
          </div>

          {/* Generate Key */}
          <div>
            <Button onClick={handleGenerateKey} className="w-full sm:w-auto">
              <Key className="w-4 h-4 mr-2" />
              Generate New Key
            </Button>
          </div>

          {/* Import Key */}
          <div className="space-y-2">
            <Label htmlFor="import-key">Import Key</Label>
            <div className="flex gap-2">
              <Input
                id="import-key"
                placeholder="Paste your exported key here..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <Button onClick={handleImportKey} variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </div>
          </div>

          {/* Keys List */}
          <div className="space-y-3">
            <Label>Your Encryption Keys ({keys.length})</Label>
            {keys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No encryption keys found</p>
                <p className="text-sm">Generate a key to start encrypting documents</p>
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map((key, index) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {index === 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Key className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {key.label || "Encryption Key"}
                          {index === 0 && (
                            <span className="ml-2 text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {key.id.substring(0, 16)}... • Created: {new Date(key.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportKey(key.id)}
                        title="Export and backup key"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(key.id)}
                        title="Copy key ID"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {keys.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteKey(key.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Encryption Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Documents encrypted with this key will become
              inaccessible unless you have backed up the key elsewhere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteKey} className="bg-destructive text-destructive-foreground">
              Delete Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
