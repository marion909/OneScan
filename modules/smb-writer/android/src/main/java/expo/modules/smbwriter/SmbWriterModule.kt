package expo.modules.smbwriter

import android.util.Base64
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

import java.security.Security
import org.bouncycastle.jce.provider.BouncyCastleProvider

import com.hierynomus.msdtyp.AccessMask
import com.hierynomus.msfscc.FileAttributes
import com.hierynomus.mssmb2.SMB2CreateDisposition
import com.hierynomus.mssmb2.SMB2ShareAccess
import com.hierynomus.smbj.SMBClient
import com.hierynomus.smbj.auth.AuthenticationContext
import com.hierynomus.smbj.share.DiskShare

import java.util.EnumSet

class SmbWriterModule : Module() {

    companion object {
        init {
            // Android ships a stripped BC that lacks MD4 (needed for NTLM).
            // Replace it with the full Bouncy Castle provider.
            Security.removeProvider("BC")
            Security.insertProviderAt(BouncyCastleProvider(), 1)
        }
    }

    override fun definition() = ModuleDefinition {
        Name("SmbWriter")

        AsyncFunction("testConnection") Coroutine { uncPath: String, username: String, password: String, domain: String ->
            withContext(Dispatchers.IO) {
                val (server, shareName, _) = parseUncPath(uncPath)
                val client = SMBClient()
                client.connect(server).use { connection ->
                    val auth = AuthenticationContext(username, password.toCharArray(), domain)
                    val session = connection.authenticate(auth)
                    session.connectShare(shareName).use { /* verbunden */ }
                }
                true
            }
        }

        AsyncFunction("writeFiles") Coroutine {
            uncPath: String, username: String, password: String, domain: String,
            jpegBase64: String, gdtBase64: String, jpegFileName: String, gdtFileName: String ->
            withContext(Dispatchers.IO) {
                val jpegBytes = Base64.decode(jpegBase64, Base64.DEFAULT)
                val gdtBytes  = Base64.decode(gdtBase64,  Base64.DEFAULT)
                val (server, shareName, subPath) = parseUncPath(uncPath)

                val client = SMBClient()
                client.connect(server).use { connection ->
                    val auth = AuthenticationContext(username, password.toCharArray(), domain)
                    val session = connection.authenticate(auth)
                    (session.connectShare(shareName) as DiskShare).use { share ->
                        writeToShare(share, subPath, jpegFileName, jpegBytes)
                        writeToShare(share, subPath, gdtFileName,  gdtBytes)
                    }
                }
            }
        }
    }

    private fun parseUncPath(unc: String): Triple<String, String, String> {
        val clean = unc.trimStart('\\', '/')
        val parts = clean.split(Regex("[/\\\\]"), limit = 3)
        return Triple(
            parts.getOrElse(0) { "" },
            parts.getOrElse(1) { "" },
            parts.getOrElse(2) { "" }
        )
    }

    private fun writeToShare(share: DiskShare, subPath: String, fileName: String, data: ByteArray) {
        val path = if (subPath.isNotEmpty()) "$subPath\\$fileName" else fileName
        share.openFile(
            path,
            EnumSet.of(AccessMask.GENERIC_WRITE),
            EnumSet.of(FileAttributes.FILE_ATTRIBUTE_NORMAL),
            SMB2ShareAccess.ALL,
            SMB2CreateDisposition.FILE_OVERWRITE_IF,
            null
        ).use { file ->
            file.outputStream.use { out ->
                out.write(data)
            }
        }
    }
}
