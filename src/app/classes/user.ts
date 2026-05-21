export class User {
    username: string;
    regions: string[];
    score: number;
    certificate: boolean;

    constructor(username: string = 'Player') {
        this.username = username;
        this.regions = ['kanto'];
        this.score = 0;
        this.certificate = false;
    }
}
