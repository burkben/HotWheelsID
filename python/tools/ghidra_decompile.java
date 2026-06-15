import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionManager;
import ghidra.util.task.ConsoleTaskMonitor;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class ghidra_decompile extends GhidraScript {

    private static final Set<String> EXPLICIT = new HashSet<>(Arrays.asList(
        "AES_init_ctx", "AES_init_ctx_iv", "AES_ctx_set_iv", "AES_CTR_xcrypt_buffer",
        "AES_ECB_encrypt", "AES_ECB_decrypt", "AES_CBC_encrypt_buffer", "AES_CBC_decrypt_buffer",
        "HMAC_init", "HMAC_update", "HMAC_finish", "crc8_calc",
        "sha256_init", "sha256_update", "sha256_final"));

    private boolean want(String n) {
        if (EXPLICIT.contains(n)) return true;
        if (n.startsWith("mpid_")) return true;
        if (n.contains("MpidLib")) return true;
        if (n.startsWith("Java_com_mcpp_mattel")) return true;
        if (n.startsWith("uECC_")) {
            for (String k : new String[]{"shared_secret", "decompress", "make_key", "verify",
                                         "sign", "valid_public_key", "compute_public_key"}) {
                if (n.contains(k)) return true;
            }
        }
        return false;
    }

    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        String outPath = (args != null && args.length > 0) ? args[0] : "mpid_decompiled.c";

        DecompInterface decomp = new DecompInterface();
        decomp.openProgram(currentProgram);
        FunctionManager fm = currentProgram.getFunctionManager();

        List<Function> funcs = new ArrayList<>();
        for (Function f : fm.getFunctions(true)) {
            if (want(f.getName())) funcs.add(f);
        }
        funcs.sort(Comparator.comparingLong(f -> f.getEntryPoint().getOffset()));

        PrintWriter w = new PrintWriter(new FileWriter(outPath));
        w.printf("// Ghidra decompilation of MPID crypto glue%n// program: %s   functions: %d%n%n",
                 currentProgram.getName(), funcs.size());
        int ok = 0;
        for (Function f : funcs) {
            String c;
            try {
                DecompileResults res = decomp.decompileFunction(f, 120, new ConsoleTaskMonitor());
                if (res != null && res.decompileCompleted()) {
                    c = res.getDecompiledFunction().getC();
                    ok++;
                } else {
                    c = "// FAILED: " + f.getName() + " : " + (res != null ? res.getErrorMessage() : "null") + "\n";
                }
            } catch (Exception e) {
                c = "// EXCEPTION " + f.getName() + ": " + e + "\n";
            }
            w.printf("%n// ===== %s @ %s =====%n", f.getName(), f.getEntryPoint());
            w.print(c);
            w.println();
        }
        w.close();
        println("Decompiled " + ok + "/" + funcs.size() + " -> " + outPath);
    }
}
