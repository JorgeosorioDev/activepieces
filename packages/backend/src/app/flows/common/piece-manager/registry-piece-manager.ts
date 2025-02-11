import { dirname } from 'node:path'
import {
    PackageType,
    PiecePackage,
    PrivatePiecePackage,
    getPackageArchivePathForPiece,
} from '@activepieces/shared'
import { packageManager } from '../../../helper/package-manager'
import { PACKAGE_ARCHIVE_PATH, PieceManager } from './piece-manager'
import { fileService } from '../../../file/file.service'
import { fileExists } from '../../../helper/file-system'
import { mkdir, writeFile } from 'node:fs/promises'

export class RegistryPieceManager extends PieceManager {
    protected override async installDependencies({ projectPath, pieces }: InstallParams): Promise<void> {
        await this.savePackageArchivesToDiskIfNotCached(pieces)
        const dependencies = pieces.map(piece => this.pieceToDependency(piece))

        await packageManager.add({
            path: projectPath,
            dependencies,
        })
    }

    private async savePackageArchivesToDiskIfNotCached(pieces: PiecePackage[]): Promise<void> {
        const packages = await this.getUncachedArchivePackages(pieces)
        const saveToDiskJobs = packages.map((piece) => this.getArchiveAndSaveToDisk(piece))
        await Promise.all(saveToDiskJobs)
    }

    private async getUncachedArchivePackages(pieces: PiecePackage[]): Promise<PrivatePiecePackage[]> {
        const packages: PrivatePiecePackage[] = []

        for (const piece of pieces) {
            if (piece.packageType !== PackageType.ARCHIVE) {
                continue
            }


            const archivePath = getPackageArchivePathForPiece({
                archiveId: piece.archiveId,
                archivePath: PACKAGE_ARCHIVE_PATH,
            })

            if (await fileExists(archivePath)) {
                continue
            }

            packages.push(piece)
        }

        return packages
    }

    private async getArchiveAndSaveToDisk(piece: PrivatePiecePackage): Promise<void> {
        const archiveId = piece.archiveId

        const archiveFile = await fileService.getOneOrThrow({
            fileId: archiveId,
        })

        const archivePath = getPackageArchivePathForPiece({
            archiveId,
            archivePath: PACKAGE_ARCHIVE_PATH,
        })

        await mkdir(dirname(archivePath), { recursive: true })
        await writeFile(archivePath, archiveFile.data)
    }

}

type InstallParams = {
    projectPath: string
    pieces: PiecePackage[]
}
