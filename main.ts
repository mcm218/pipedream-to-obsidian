import { App, Vault, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface PipedreamToObsidianSettings {
    apiEndpoint: string;
    folder: string;
}

const DEFAULT_SETTINGS: PipedreamToObsidianSettings = {
    apiEndpoint: 'default',
    folder: ''
}

export default class PipedreamToObsidian extends Plugin {
	settings: PipedreamToObsidianSettings;
	urlRegex: RegExp = new RegExp('^(http|https)://', 'i');

	async onload() {
        await this.loadSettings();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'make-pipedream-call',
			name: 'Sync Tasks',
            callback: async () => {
                await this.getTodoistTasks();
                new Notice('Synced Tasks');
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PipedreamToObsidianSettingsTab(this.app, this));
	}

	onunload() {

    }

    getTodoistTasks = async () => {
        // Validate settings.apiEndpoint is a valid http/https url with regex
        if (!this.urlRegex.test(this.settings.apiEndpoint)) {
            new Notice('Please configure the plugin settings before making a call.');
            return;
        }

        const headers = new Headers()
        headers.append("Content-Type", "application/json")

        const body = {
            "test": "event"
        }

        const options: RequestInit = {
            method: "POST",
            headers,
            mode: "cors",
            body: JSON.stringify(body),
        }
        // Make a call to the Pipedream API
        const response = await fetch(this.settings.apiEndpoint, options)

        if (!response.ok) {
            new Notice(`Error: ${response.status} ${response.statusText}`);
            return;
        }
        const responseData = await response.json();

        const todoistTasks: Task[] = Object.values(responseData);

        for (const task of todoistTasks) {
            await this.todoistTaskToNote (task);
        }
    }
    
    todoistTaskToNote = async (task: Task) => {
        // Convert the task into markdown with extra props as frontmatter
        const taskMarkdown = 
`---
id: ${task.id}
labels: ${task.labels}
priority: ${task.priority}
${task.assigneeId ? `created: ${task.assigneeId}` : ''}
---
${task.content}
${task.description}
`;
        // Parse the title to remove *"\/<>:|? that wouldn't work as a file name
        const title = task.content.replace(/[*"\\/<>:|?]/g, '');
        // Create a new file in the vault with the task content
        const newFile = await this.app.vault.create(`${this.settings.folder}/${title}.md`, taskMarkdown);

    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class PipedreamToObsidianSettingsTab extends PluginSettingTab {
	plugin: PipedreamToObsidian;

	constructor(app: App, plugin: PipedreamToObsidian) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('URL Endpoint')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.apiEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.apiEndpoint = value;
					await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Folder')
            .addText(text => text
                .setPlaceholder('Enter the folder to save notes to')
                .setValue(this.plugin.settings.folder)
                .onChange(async (value) => {
                    this.plugin.settings.folder = value;
                    await this.plugin.saveSettings();
                }
            ));
	}
}

import {
    Boolean,
    Number as NumberRunType,
    String,
    Array,
    Record,
    Static,
    Partial,
    Literal,
    Union,
    Null,
} from 'runtypes'

export const Int = NumberRunType.withConstraint(
    (n) => Number.isInteger(n) || `${n} is not a valid entity id. Should be a string`,
)

export type TodoistEntity = {
    id: string
}

export type OrderedEntity = TodoistEntity & {
    order: number
}

export type EntityInHierarchy = OrderedEntity & {
    parentId?: string | null
}

export const DueDate = Record({
    isRecurring: Boolean,
    string: String,
    date: String,
}).And(
    Partial({
        datetime: String.Or(Null),
        timezone: String.Or(Null),
    }),
)

export type DueDate = Static<typeof DueDate>

export const Task = Record({
    id: String,
    order: Int,
    content: String,
    description: String,
    projectId: String,
    isCompleted: Boolean,
    labels: Array(String),
    priority: Int,
    commentCount: Int,
    createdAt: String,
    url: String,
    creatorId: String,
}).And(
    Partial({
        due: DueDate.Or(Null),
        assigneeId: String.Or(Null),
        assignerId: String.Or(Null),
        parentId: String.Or(Null),
        sectionId: String.Or(Null),
    }),
)

export type Task = Static<typeof Task>

export const Project = Record({
    id: String,
    name: String,
    color: String,
    commentCount: Int,
    isShared: Boolean,
    isFavorite: Boolean,
    url: String,
    isInboxProject: Boolean,
    isTeamInbox: Boolean,
    order: Int,
    viewStyle: String,
}).And(
    Partial({
        parentId: String.Or(Null),
    }),
)

export type Project = Static<typeof Project>

export const Section = Record({
    id: String,
    order: Int,
    name: String,
    projectId: String,
})

export type Section = Static<typeof Section>

export const Label = Record({
    id: String,
    order: Int,
    name: String,
    color: String,
    isFavorite: Boolean,
})

export type Label = Static<typeof Label>

export const Attachment = Record({
    resourceType: String,
}).And(
    Partial({
        fileName: String.Or(Null),
        fileSize: Int.Or(Null),
        fileType: String.Or(Null),
        fileUrl: String.Or(Null),
        fileDuration: Int.Or(Null),
        uploadState: Union(Literal('pending'), Literal('completed')).Or(Null),
        image: String.Or(Null),
        imageWidth: Int.Or(Null),
        imageHeight: Int.Or(Null),
        url: String.Or(Null),
        title: String.Or(Null),
    }),
)

export type Attachment = Static<typeof Attachment>

export const Comment = Record({
    id: String,
    content: String,
    postedAt: String,
}).And(
    Partial({
        taskId: String.Or(Null),
        projectId: String.Or(Null),
        attachment: Attachment.Or(Null),
    }),
)

export type Comment = Static<typeof Comment>

export const User = Record({
    id: String,
    name: String,
    email: String,
})

export type User = Static<typeof User>

export type Color = {
    /**
     * @deprecated No longer used
     */
    id: number
    /**
     * The key of the color (i.e. 'berry_red')
     */
    key: string
    /**
     * The display name of the color (i.e. 'Berry Red')
     */
    displayName: string
    /**
     * @deprecated Use {@link Color.displayName} instead
     */
    name: string
    /**
     * The hex value of the color (i.e. '#b8255f')
     */
    hexValue: string
    /**
     * @deprecated Use {@link Color.hexValue} instead
     */
    value: string
}

export type QuickAddTaskResponse = {
    id: string
    projectId: string
    content: string
    description: string
    priority: number
    sectionId: string | null
    parentId: string | null
    childOrder: number // order
    labels: string[]
    responsibleUid: string | null
    checked: boolean // completed
    addedAt: string // created
    addedByUid: string | null
    due: {
        date: string
        timezone: string | null
        isRecurring: boolean
        string: string
        lang: string
    } | null
}